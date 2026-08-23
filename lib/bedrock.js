import AWS from 'aws-sdk';
import User from './models/User';
import Client from './models/Client';
import Document from './models/Document';
import UserSession from './models/UserSession';
import dbConnect from './db';

const bedrock = new AWS.BedrockRuntime({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

function caLine(client) {
  const phone = client.consultantPhone || null;
  const name = client.createdBy?.name || 'CA';
  return phone
    ? `\n\n📞 Koi bhi sawaal ho toh apne CA se milein:\n*${name}*: ${phone}`
    : `\n\n📞 Apne CA se contact karein: *${name}*`;
}

function normalizeYear(text) {
  if (!text) return null;
  const str = text.toLowerCase().trim();
  
  // Match 2024-25, 2027-28, 2024-2025, 2024/25, etc.
  const mFull = str.match(/\b(20\d{2})[-/](20)?(\d{2})\b/);
  if (mFull) {
    return `${mFull[1]}-${mFull[3]}`;
  }
  // Match 24-25, 27-28, 24/25, etc.
  const mShort = str.match(/\b(\d{2})[-/](\d{2})\b/);
  if (mShort) {
    return `20${mShort[1]}-${mShort[2]}`;
  }
  // Match single 4-digit year e.g. 2024 or 2027
  const mSingleYear = str.match(/\b(20\d{2})\b/);
  if (mSingleYear) {
    const y = parseInt(mSingleYear[1], 10);
    return `${y}-${(y + 1).toString().slice(-2)}`;
  }
  // Match 2-digit standalone year e.g. 24, 25, 27, 28
  const mTwoDigit = str.match(/\b([23]\d)\b/);
  if (mTwoDigit) {
    const y = parseInt(`20${mTwoDigit[1]}`, 10);
    return `${y}-${(y + 1).toString().slice(-2)}`;
  }
  return null;
}

function detectDocType(text) {
  if (!text) return null;
  const l = text.toLowerCase();
  if (l.includes('itr') || l.includes('income tax')) return 'ITR';
  if (l.includes('gstr1') || l.includes('gstr-1')) return 'GSTR1';
  if (l.includes('gstr3b') || l.includes('gstr-3b')) return 'GSTR3B';
  if (l.includes('gst')) return 'GST';
  if (l.includes('balance sheet') || l.includes('pnl') || l.includes('profit')) return 'BALANCE_SHEET';
  if (l.includes('audit')) return 'TAX_AUDIT';
  if (l.includes('form 16') || l.includes('form16')) return 'FORM_16';
  if (l.includes('tds')) return 'TDS_RETURN';
  if (l.includes('computation')) return 'COMPUTATION';
  return null;
}

function parseIndexSelection(text) {
  if (!text) return null;
  const str = text.toLowerCase().trim();
  
  if (['1', '1st', 'first', 'pehla', 'pehli', 'option 1', '#1', 'number 1', 'no 1', 'no.1', 'opt 1'].includes(str)) return 1;
  if (['2', '2nd', 'second', 'doosra', 'doosri', 'option 2', '#2', 'number 2', 'no 2', 'no.2', 'opt 2'].includes(str)) return 2;
  if (['3', '3rd', 'third', 'teesra', 'teesri', 'option 3', '#3', 'number 3', 'no 3', 'no.3', 'opt 3'].includes(str)) return 3;
  if (['4', '4th', 'fourth', 'chautha', 'option 4', '#4', 'number 4', 'no 4', 'no.4', 'opt 4'].includes(str)) return 4;
  if (['5', '5th', 'fifth', 'paanchwa', 'option 5', '#5', 'number 5', 'no 5', 'no.5', 'opt 5'].includes(str)) return 5;

  const m = str.match(/^(?:option|number|no\.?|#)?\s*([1-9])\b/i);
  if (m) {
    return parseInt(m[1], 10);
  }
  return null;
}

export async function processWhatsAppMessage(incomingMessage, fromNumber, caId = null) {
  await dbConnect();
  
  const digits = fromNumber.replace(/\D/g, '');
  let clientFilter = {
    $or: [
      { whatsappNumber: fromNumber },
      { whatsappNumber: `+${fromNumber}` },
      { whatsappNumber: { $regex: `${digits}$`, $options: 'i' } }
    ]
  };

  if (caId) {
    clientFilter.createdBy = caId;
  }

  const client = await Client.findOne(clientFilter).populate('createdBy', 'name');

  if (!client) {
    return {
      success: false,
      unregistered: true,
      responseText: '❌ You are not registered. Please contact your CA or select a registered client.'
    };
  }

  const effectiveCaId = caId || client.createdBy?._id || client.createdBy;
  const lower = incomingMessage.toLowerCase().trim();

  // Retrieve or create UserSession for this specific CA and phone number
  let session = null;
  try {
    session = await UserSession.findOneAndUpdate(
      { caId: effectiveCaId, phoneNumber: fromNumber },
      { $set: { welcomed: true, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
  } catch (sessionErr) {
    if (sessionErr.code === 11000 || sessionErr.message?.includes('phoneNumber_1')) {
      try {
        await UserSession.collection.dropIndex('phoneNumber_1');
      } catch (e) {}
      session = await UserSession.findOneAndUpdate(
        { caId: effectiveCaId, phoneNumber: fromNumber },
        { $set: { welcomed: true, updatedAt: new Date() } },
        { upsert: true, new: true }
      );
    } else {
      throw sessionErr;
    }
  }


  // NUMERICAL INDEX SELECTION HANDLER (e.g. user sends "1", "2", "1st", "option 1")
  const selectedIndex = parseIndexSelection(incomingMessage);
  const pendingList = session?.pendingDocList || [];

  if (selectedIndex && pendingList.length > 0) {
    const docIdx = selectedIndex - 1;
    if (docIdx >= 0 && docIdx < pendingList.length) {
      const doc = pendingList[docIdx];
      await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocList: [], pendingDocType: null } });

      let responseText = `📄 *Aapka selected document (#${selectedIndex}):*\n\n`;
      responseText += `1. *${doc.documentType} ${doc.year}*\n🔗 View Document: ${doc.fileUrl}\n\n`;
      responseText += `Kuch aur chahiye? "hi" boliye 😊`;

      return {
        success: true,
        client: { name: client.name, whatsappNumber: client.whatsappNumber },
        responseText
      };
    }
  }

  // Human Interactive Greeting Handler
  const isGreeting = ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening', 'hlo', 'hiii', 'helo', 'kaise ho', 'pranam', 'kya haal hai', 'start'].includes(lower);
  if (isGreeting) {
    await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocType: null, pendingDocList: [] } });

    return {
      success: true,
      client: { name: client.name, whatsappNumber: client.whatsappNumber },
      responseText: `Hello ${client.name}! 👋\n\nWelcome to *${client.createdBy?.name || 'CA'}* Document Portal.\n\nAapko kaunsa document chahiye? Aap humse naturally pooch sakte hain!\n\n*Examples:*\n• "ITR 2024-25"\n• "GSTR-3B"\n• "Mujhe pichle saal ka return chahiye"\n• Say *contact* to call your CA 😊`
    };
  }

  // Contact CA request
  if (['contact', 'call', 'phone', 'number', 'consultant', 'ca contact'].some(k => lower.includes(k))) {
    const phone = client.consultantPhone || 'Not available';
    return {
      success: true,
      client: { name: client.name, whatsappNumber: client.whatsappNumber },
      responseText: `📞 *Your CA Contact*\n\nCA: ${client.createdBy?.name || 'N/A'}\nPhone: ${phone}\n\nSay "hi" to go back.`
    };
  }

  const rawClientDocs = await Document.find({ clientId: client._id, uploadedBy: effectiveCaId }).lean();
  const clientDocs = rawClientDocs.map(d => ({
    ...d,
    fileUrl: `/api/documents/download?id=${d._id}`
  }));

  if (clientDocs.length === 0) {
    return {
      success: true,
      client: { name: client.name, whatsappNumber: client.whatsappNumber },
      responseText: `Abhi aapke koi documents upload nahi hue hain. Apne CA se request karein.${caLine(client)}`
    };
  }

  const explicitYear = normalizeYear(incomingMessage);
  const detectedType = detectDocType(incomingMessage);

  // CONVERSATIONAL MEMORY STEP:
  // User previously asked for document (e.g. "ITR") and now sends the year (e.g. "27-28", "2024-25", etc.)
  const pendingDocType = session?.pendingDocType;
  if (explicitYear && !detectedType && pendingDocType) {
    const targetType = pendingDocType;
    await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocType: null } });

    const matched = clientDocs.filter(d => 
      (d.documentType.toUpperCase() === targetType.toUpperCase() || d.documentType.toUpperCase().includes(targetType.toUpperCase())) &&
      normalizeYear(d.year) === explicitYear
    );

    const availableYearsForDoc = [...new Set(clientDocs.filter(d => d.documentType.toUpperCase().includes(targetType.toUpperCase())).map(d => d.year))];
    const availableStr = availableYearsForDoc.length > 0 ? ` (Available years: ${availableYearsForDoc.join(', ')})` : '';

    if (matched.length > 0) {
      // Save pendingDocList for numerical option selection if multiple docs match
      const docListPayload = matched.map(d => ({ documentType: d.documentType, year: d.year, fileUrl: d.fileUrl }));
      await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocList: docListPayload } });

      let responseText = `📄 *Aapka ${targetType} (${explicitYear}) document:*\n\n`;
      matched.forEach((doc, i) => {
        responseText += `${i + 1}. *${doc.documentType} ${doc.year}*\n🔗 View Document: ${doc.fileUrl}\n\n`;
      });
      responseText += `Kuch aur chahiye? "hi" boliye 😊`;
      return { success: true, responseText, client: { name: client.name, whatsappNumber: client.whatsappNumber } };
    } else {
      return {
        success: true,
        client: { name: client.name, whatsappNumber: client.whatsappNumber },
        responseText: `Aapka *${targetType}* for year *${explicitYear}* abhi available nahi hai.${availableStr}${caLine(client)}`
      };
    }
  }

  // If user asks for just doc type (e.g. "ITR" or "GST") without specifying any year
  if (detectedType && !explicitYear) {
    await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocType: detectedType, pendingDocList: [] } }, { upsert: true });

    const availableYears = [...new Set(clientDocs.filter(d => d.documentType.toUpperCase().includes(detectedType.toUpperCase())).map(d => d.year))];
    const yearOptions = availableYears.length > 0 ? ` (Available years: ${availableYears.join(', ')})` : '';

    return {
      success: true,
      client: { name: client.name, whatsappNumber: client.whatsappNumber },
      responseText: `Aapko *${detectedType}* kaunse financial year ka chahiye?${yearOptions}\n\n(Example: "2024-25" ya "24-25")`
    };
  }

  // If user specifies BOTH document type and explicit year in single message (e.g. "ITR 27-28" or "ITR 2024-25")
  if (detectedType && explicitYear) {
    await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocType: null } });

    const matched = clientDocs.filter(d =>
      (d.documentType.toUpperCase() === detectedType.toUpperCase() || d.documentType.toUpperCase().includes(detectedType.toUpperCase())) &&
      normalizeYear(d.year) === explicitYear
    );

    const availableYearsForDoc = [...new Set(clientDocs.filter(d => d.documentType.toUpperCase().includes(detectedType.toUpperCase())).map(d => d.year))];
    const availableStr = availableYearsForDoc.length > 0 ? ` (Available years: ${availableYearsForDoc.join(', ')})` : '';

    if (matched.length > 0) {
      const docListPayload = matched.map(d => ({ documentType: d.documentType, year: d.year, fileUrl: d.fileUrl }));
      await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocList: docListPayload } });

      let responseText = `📄 *Aapka ${detectedType} (${explicitYear}) document:*\n\n`;
      matched.forEach((doc, i) => {
        responseText += `${i + 1}. *${doc.documentType} ${doc.year}*\n🔗 View Document: ${doc.fileUrl}\n\n`;
      });
      responseText += `Kuch aur chahiye? "hi" boliye 😊`;
      return { success: true, responseText, client: { name: client.name, whatsappNumber: client.whatsappNumber } };
    } else {
      return {
        success: true,
        client: { name: client.name, whatsappNumber: client.whatsappNumber },
        responseText: `Aapka *${detectedType}* for year *${explicitYear}* abhi available nahi hai.${availableStr}${caLine(client)}`
      };
    }
  }

  const uniqueDocs = [...new Set(clientDocs.map(d => `${d.documentType} (${d.year})`))];

  // Try AWS Bedrock AI matching for complex natural language queries
  try {
    const caName = client.createdBy?.name || 'CA';
    const caPhone = client.consultantPhone || 'available on request';

    const prompt = `You are a helpful assistant for CA firm "${caName}". You handle WhatsApp messages for client "${client.name}".

Client's message: "${incomingMessage}"

All documents available for this client:
${uniqueDocs.slice(0, 50).join('\n')}

CA Contact: ${caName} — ${caPhone}

Respond ONLY in this exact JSON format:
{
  "isGreeting": true or false,
  "isDocumentRequest": true or false,
  "matchedDocs": ["EXACT_DOCTYPE (YEAR)"],
  "isListRequest": true or false,
  "reply": "your warm natural reply here"
}`;

    const body = JSON.stringify({
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 400, temperature: 0.1 }
    });

    const result = await bedrock.invokeModel({
      modelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body
    }).promise();

    const responseBody = JSON.parse(Buffer.from(result.body).toString());
    const aiText = responseBody.output.message.content[0].text.trim();
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.isGreeting) {
        return {
          success: true,
          client: { name: client.name, whatsappNumber: client.whatsappNumber },
          responseText: parsed.reply || `Hello ${client.name}! 👋 Kaunsa document chahiye aapko?`
        };
      }

      if (parsed.isDocumentRequest && parsed.matchedDocs && parsed.matchedDocs.length > 0) {
        let found = [];
        for (const matchStr of parsed.matchedDocs) {
          const m = matchStr.match(/^(.+?)\s*\((.+?)\)$/);
          if (!m) continue;
          const docType = m[1].trim();
          const yr = m[2].trim();
          const doc = clientDocs.find(d => d.documentType.toLowerCase() === docType.toLowerCase() && (d.year === yr || normalizeYear(d.year) === normalizeYear(yr)));
          if (doc) found.push(doc);
        }

        // Apply strict explicit year filter if client message specified a year
        if (explicitYear) {
          found = found.filter(d => normalizeYear(d.year) === explicitYear);
        }

        if (found.length > 0) {
          const docListPayload = found.map(d => ({ documentType: d.documentType, year: d.year, fileUrl: d.fileUrl }));
          await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocList: docListPayload } });

          const intro = parsed.reply ? `${parsed.reply}\n\n` : '';
          let responseText = `${intro}📄 *${found.length} document(s) found:*\n\n`;
          found.forEach((doc, i) => {
            responseText += `${i + 1}. *${doc.documentType} ${doc.year}*\n🔗 View Document: ${doc.fileUrl}\n\n`;
          });
          responseText += `Kuch aur chahiye? "hi" boliye 😊`;
          return { success: true, responseText, client: { name: client.name, whatsappNumber: client.whatsappNumber } };
        }
      }

      if (parsed.isListRequest) {
        let responseText = (parsed.reply ? `${parsed.reply}\n\n` : 'Yeh hain aapke available documents:\n\n');
        uniqueDocs.forEach(d => { responseText += `📄 *${d}*\n`; });
        responseText += `\nKisi specific document ke liye naam aur year batayein 😊`;
        return { success: true, responseText, client: { name: client.name, whatsappNumber: client.whatsappNumber } };
      }

      if (parsed.reply) {
        return {
          success: true,
          client: { name: client.name, whatsappNumber: client.whatsappNumber },
          responseText: `${parsed.reply}${caLine(client)}`
        };
      }
    }
  } catch (err) {
    console.log('Bedrock fallback to rule matching:', err.message);
  }

  // Fallback rule matching ONLY if document type or year was detected
  if (detectedType || explicitYear) {
    let matched = clientDocs;
    if (detectedType) {
      matched = clientDocs.filter(d => d.documentType.toUpperCase().includes(detectedType.toUpperCase()));
    }
    if (explicitYear) {
      matched = matched.filter(d => normalizeYear(d.year) === explicitYear);
    }

    if (matched.length > 0) {
      const docListPayload = matched.map(d => ({ documentType: d.documentType, year: d.year, fileUrl: d.fileUrl }));
      await UserSession.findOneAndUpdate({ caId: effectiveCaId, phoneNumber: fromNumber }, { $set: { pendingDocList: docListPayload } });

      let responseText = `📄 *Aapke requested document(s):*\n\n`;
      matched.forEach((doc, i) => {
        responseText += `${i + 1}. *${doc.documentType} ${doc.year}*\n🔗 View Document: ${doc.fileUrl}\n\n`;
      });
      return { success: true, responseText, client: { name: client.name, whatsappNumber: client.whatsappNumber } };
    }
  }

  return {
    success: true,
    client: { name: client.name, whatsappNumber: client.whatsappNumber },
    responseText: `Mujhe samajh nahi aaya. Kripya document ka naam aur saal batayein (e.g. ITR 2024-25, GSTR3B).${caLine(client)}`
  };
}
