import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './ClientDetail.css';

const CLIENT_TYPE_LABELS = {
  COMPANY: '🏢 Company',
  PARTNERSHIP_LLP: '🤝 Partnership / LLP',
  PROPRIETORSHIP: '🏪 Proprietorship',
  INDIVIDUAL: '👤 Individual',
  TRUST_NGO: '🏛️ Trust / NGO'
};

const TYPE_TO_CATEGORY = {
  PAN: 'KYC', TAN: 'KYC', GST_CERTIFICATE: 'KYC', INCORPORATION: 'KYC',
  PARTNERSHIP_DEED: 'KYC', LLP_AGREEMENT: 'KYC', TRUST_DEED: 'KYC',
  AADHAAR: 'KYC', ADDRESS_PROOF: 'KYC', BANK_DETAILS: 'KYC',
  ITR_RETURN: 'INCOME TAX', COMPUTATION: 'INCOME TAX', TAX_CHALLANS: 'INCOME TAX',
  AIS_26AS: 'INCOME TAX', ASSESSMENT_NOTICE: 'INCOME TAX',
  GSTR1: 'GST', GSTR3B: 'GST', GSTR2A: 'GST', GSTR2B: 'GST',
  GST_WORKING: 'GST', GST_CHALLANS: 'GST',
  TDS_RETURN: 'TDS', TDS_CHALLAN: 'TDS', FORM_16: 'TDS',
  FORM_16A: 'TDS', TDS_CERTIFICATE: 'TDS',
  TRIAL_BALANCE: 'ACCOUNTING', LEDGER: 'ACCOUNTING', PROFIT_LOSS: 'ACCOUNTING',
  BALANCE_SHEET: 'ACCOUNTING', TALLY_BACKUP: 'ACCOUNTING',
  INCOME_STATEMENT: 'ACCOUNTING', CAPITAL_ACCOUNT: 'ACCOUNTING',
  TAX_AUDIT: 'AUDIT', STATUTORY_AUDIT: 'AUDIT', AUDIT_WORKING: 'AUDIT',
  INCOME_TAX_NOTICE: 'NOTICES', GST_NOTICE: 'NOTICES',
  NOTICE_REPLY: 'NOTICES', FINAL_ORDER: 'NOTICES',
  BANK_STATEMENT: 'BANKING', LOAN_DOCUMENT: 'BANKING', EMI_SCHEDULE: 'BANKING',
  AGREEMENT: 'LEGAL', CONTRACT: 'LEGAL', PROPERTY_DOCUMENT: 'LEGAL',
  AOC4: 'ROC', MGT7: 'ROC', ROC_FILING: 'ROC'
};

const CATEGORY_ICONS = {
  'KYC': '🪪', 'INCOME TAX': '📊', 'GST': '🧾', 'TDS': '📋',
  'ACCOUNTING': '📒', 'AUDIT': '🔍', 'NOTICES': '📬',
  'BANKING': '🏦', 'LEGAL': '⚖️', 'ROC': '🏛️', 'OTHER': '📁'
};

function getCategory(docType) {
  const base = docType.split('-')[0];
  return TYPE_TO_CATEGORY[base] || 'OTHER';
}

function groupByCategory(docs) {
  const groups = {};
  docs.forEach(doc => {
    const cat = getCategory(doc.documentType);
    if (!groups[cat]) groups[cat] = {};
    const yr = doc.year || 'N/A';
    if (!groups[cat][yr]) groups[cat][yr] = [];
    groups[cat][yr].push(doc);
  });
  return groups;
}

function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ consultantPhone: '' });
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [expandedYears, setExpandedYears] = useState({});

  const fetchClientDetails = useCallback(async () => {
    try {
      const res = await api.get('/clients');
      const found = res.data.clients.find(c => c._id === clientId);
      setClient(found);
      setEditData({ consultantPhone: found?.consultantPhone || '' });
    } catch {
      navigate('/clients');
    }
  }, [clientId, navigate]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get(`/documents/client/${clientId}`);
      setDocuments(res.data.documents || []);
    } catch {
      console.error('Error fetching documents');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientDetails();
    fetchDocuments();
  }, [fetchClientDetails, fetchDocuments]);

  const handleUpdateClient = async () => {
    try {
      await api.put(`/clients/${clientId}`, editData);
      setClient({ ...client, ...editData });
      setEditMode(false);
    } catch {
      alert('Failed to update client');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter(d => d._id !== docId));
    } catch {
      alert('Failed to delete document');
    }
  };

  const toggleYear = (key) => {
    setExpandedYears(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!client) return <div className="error">Client not found</div>;

  const grouped = groupByCategory(documents);
  const categories = ['ALL', ...Object.keys(grouped).sort()];
  const filteredGrouped = activeCategory === 'ALL'
    ? grouped
    : { [activeCategory]: grouped[activeCategory] || {} };

  return (
    <div className="client-detail-container">
      <button onClick={() => navigate('/clients')} className="back-btn">
        ← Back to Clients
      </button>

      <div className="client-info-card">
        <div className="client-info-header">
          <div>
            <h1>{client.name}</h1>
            <span className="client-type-badge">
              {CLIENT_TYPE_LABELS[client.clientType] || '👤 Individual'}
            </span>
          </div>
          <button onClick={() => setEditMode(!editMode)} className="edit-btn">
            {editMode ? '❌ Cancel' : '✏️ Edit'}
          </button>
        </div>
        <div className="client-details">
          <div className="detail-item">
            <span className="label">📱 WhatsApp:</span>
            <span className="value">{client.whatsappNumber}</span>
          </div>
          <div className="detail-item">
            <span className="label">📞 Consultant:</span>
            {editMode ? (
              <input
                type="tel"
                value={editData.consultantPhone}
                onChange={e => setEditData({ ...editData, consultantPhone: e.target.value })}
                placeholder="+919876543210"
                className="edit-input"
              />
            ) : (
              <span className="value">{client.consultantPhone || 'Not set'}</span>
            )}
          </div>
          <div className="detail-item">
            <span className="label">📄 Total Docs:</span>
            <span className="value">{documents.length}</span>
          </div>
          {editMode && (
            <button onClick={handleUpdateClient} className="save-btn">💾 Save</button>
          )}
        </div>
      </div>

      <div className="documents-section">
        <div className="section-header">
          <h2>📁 Documents</h2>
          <button
            onClick={() => navigate('/upload-document', { state: { clientId } })}
            className="upload-btn"
          >
            ➕ Upload Document
          </button>
        </div>

        <div className="category-filter">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat !== 'ALL' && CATEGORY_ICONS[cat]} {cat}
              {cat !== 'ALL' && grouped[cat] && (
                <span className="cat-count">
                  {Object.values(grouped[cat]).flat().length}
                </span>
              )}
            </button>
          ))}
        </div>

        {documents.length === 0 ? (
          <div className="no-documents">
            <p>No documents uploaded yet</p>
            <button
              onClick={() => navigate('/upload-document', { state: { clientId } })}
              className="upload-btn-large"
            >
              ➕ Upload First Document
            </button>
          </div>
        ) : (
          <div className="doc-categories">
            {Object.entries(filteredGrouped).map(([cat, yearGroups]) => (
              <div key={cat} className="doc-category-block">
                <div className="doc-category-header">
                  <span>{CATEGORY_ICONS[cat] || '📁'} {cat}</span>
                  <span className="doc-cat-total">
                    {Object.values(yearGroups).flat().length} docs
                  </span>
                </div>
                {Object.entries(yearGroups)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([year, docs]) => {
                    const key = `${cat}-${year}`;
                    const isOpen = expandedYears[key] !== false;
                    return (
                      <div key={year} className="doc-year-group">
                        <button className="year-toggle" onClick={() => toggleYear(key)}>
                          <span>📅 {year}</span>
                          <span>{isOpen ? '▲' : '▼'} {docs.length} files</span>
                        </button>
                        {isOpen && (
                          <div className="doc-files-list">
                            {docs.map(doc => (
                              <div key={doc._id} className="doc-file-row">
                                <div className="doc-file-info">
                                  <span className="doc-type-tag">{doc.documentType}</span>
                                  <span className="doc-filename">{doc.fileName}</span>
                                  <span className="doc-date">
                                    {new Date(doc.uploadDate).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="doc-file-actions">
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-view-sm">
                                    👁️ View
                                  </a>
                                  <button onClick={() => handleDeleteDocument(doc._id)} className="btn-del-sm">
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientDetail;
