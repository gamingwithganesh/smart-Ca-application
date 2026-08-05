import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getClients, uploadDocument } from '../api';
import './Form.css';

// Document categories with types
const DOC_CATEGORIES = {
  'KYC': ['PAN', 'TAN', 'GST_CERTIFICATE', 'INCORPORATION', 'PARTNERSHIP_DEED', 'LLP_AGREEMENT', 'TRUST_DEED', 'AADHAAR', 'ADDRESS_PROOF', 'BANK_DETAILS'],
  'INCOME TAX': ['ITR_RETURN', 'COMPUTATION', 'TAX_CHALLANS', 'AIS_26AS', 'ASSESSMENT_NOTICE'],
  'GST': ['GSTR1', 'GSTR3B', 'GSTR2A', 'GSTR2B', 'GST_WORKING', 'GST_CHALLANS'],
  'TDS': ['TDS_RETURN', 'TDS_CHALLAN', 'FORM_16', 'FORM_16A', 'TDS_CERTIFICATE'],
  'ACCOUNTING': ['TRIAL_BALANCE', 'LEDGER', 'PROFIT_LOSS', 'BALANCE_SHEET', 'TALLY_BACKUP', 'INCOME_STATEMENT', 'CAPITAL_ACCOUNT'],
  'AUDIT': ['TAX_AUDIT', 'STATUTORY_AUDIT', 'AUDIT_WORKING'],
  'NOTICES': ['INCOME_TAX_NOTICE', 'GST_NOTICE', 'NOTICE_REPLY', 'FINAL_ORDER'],
  'BANKING': ['BANK_STATEMENT', 'LOAN_DOCUMENT', 'EMI_SCHEDULE'],
  'LEGAL': ['AGREEMENT', 'CONTRACT', 'PROPERTY_DOCUMENT'],
  'ROC': ['AOC4', 'MGT7', 'ROC_FILING']
};

// Types that need month/quarter
const MONTHLY_TYPES = ['GSTR1', 'GSTR3B', 'GSTR2A', 'GSTR2B', 'GST_WORKING', 'GST_CHALLANS', 'TDS_RETURN', 'TDS_CHALLAN'];
const QUARTERLY_TYPES = ['TDS_RETURN', 'TDS_CHALLAN', 'FORM_16A'];

// Types that don't need financial year
const NO_YEAR_TYPES = ['PAN', 'TAN', 'GST_CERTIFICATE', 'INCORPORATION', 'PARTNERSHIP_DEED', 'LLP_AGREEMENT', 'TRUST_DEED', 'AADHAAR', 'ADDRESS_PROOF', 'BANK_DETAILS', 'AGREEMENT', 'CONTRACT', 'PROPERTY_DOCUMENT'];

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function UploadDocument() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedClientId = location.state?.clientId || '';

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    clientId: preselectedClientId,
    year: '',
    category: 'INCOME TAX',
    documentType: 'ITR_RETURN',
    period: 'YEARLY',
    month: '',
    quarter: ''
  });
  const [isCustom, setIsCustom] = useState(false);
  const [customDocName, setCustomDocName] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const res = await getClients();
      setClients(res.data.clients);
    } catch {
      setError('Failed to load clients');
    }
  };

  const handleCategoryChange = (cat) => {
    const firstType = DOC_CATEGORIES[cat][0];
    setFormData({ ...formData, category: cat, documentType: firstType, period: 'YEARLY', month: '', quarter: '' });
    setIsCustom(false);
  };

  const handleTypeChange = (type) => {
    setFormData({ ...formData, documentType: type, period: 'YEARLY', month: '', quarter: '' });
  };

  const needsMonth = !isCustom && MONTHLY_TYPES.includes(formData.documentType) && formData.period === 'MONTHLY';
  const needsQuarter = !isCustom && QUARTERLY_TYPES.includes(formData.documentType) && formData.period === 'QUARTERLY';
  const showPeriod = !isCustom && (MONTHLY_TYPES.includes(formData.documentType) || QUARTERLY_TYPES.includes(formData.documentType));
  const noYear = !isCustom && NO_YEAR_TYPES.includes(formData.documentType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) return setError('Please select a file');
    if (!noYear && !formData.year) return setError('Please enter financial year');
    if (isCustom && !customDocName.trim()) return setError('Please enter custom document name');
    if (needsMonth && !formData.month) return setError('Please select a month');
    if (needsQuarter && !formData.quarter) return setError('Please select a quarter');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('clientId', formData.clientId);
      fd.append('year', noYear ? 'N/A' : formData.year);

      let docType = isCustom ? customDocName.trim().toUpperCase() : formData.documentType;
      if (!isCustom && needsMonth) docType = `${docType}-${formData.month}`;
      if (!isCustom && needsQuarter) docType = `${docType}-Q${formData.quarter}`;

      fd.append('documentType', docType);
      fd.append('document', file);

      await uploadDocument(fd);
      setSuccess('Document uploaded successfully!');
      setTimeout(() => {
        if (preselectedClientId) navigate(`/client/${preselectedClientId}`);
        else navigate('/dashboard');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card" style={{ maxWidth: 600 }}>
        <h2>Upload Document</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Client */}
          <div className="form-group">
            <label>Select Client</label>
            <select value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} required>
              <option value="">Choose a client</option>
              {clients.map(c => (
                <option key={c._id} value={c._id}>{c.name} ({c.whatsappNumber})</option>
              ))}
            </select>
          </div>

          {/* Category tabs */}
          <div className="form-group">
            <label>Category</label>
            <div className="category-tabs">
              {Object.keys(DOC_CATEGORIES).map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-tab ${formData.category === cat && !isCustom ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Custom doc checkbox */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isCustom}
                onChange={e => setIsCustom(e.target.checked)}
              />
              &nbsp; Custom document type
            </label>
          </div>

          {isCustom ? (
            <div className="form-group">
              <label>Custom Document Name</label>
              <input
                type="text"
                placeholder="e.g., PARTNERSHIP_DEED_AMENDMENT"
                value={customDocName}
                onChange={e => setCustomDocName(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label>Document Type</label>
              <select value={formData.documentType} onChange={e => handleTypeChange(e.target.value)} required>
                {DOC_CATEGORIES[formData.category].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {/* Period for monthly/quarterly types */}
          {showPeriod && (
            <div className="form-group">
              <label>Period Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="period" value="MONTHLY"
                    checked={formData.period === 'MONTHLY'}
                    onChange={e => setFormData({ ...formData, period: e.target.value, month: '', quarter: '' })}
                  /> Monthly
                </label>
                <label className="radio-label">
                  <input type="radio" name="period" value="QUARTERLY"
                    checked={formData.period === 'QUARTERLY'}
                    onChange={e => setFormData({ ...formData, period: e.target.value, month: '', quarter: '' })}
                  /> Quarterly
                </label>
                <label className="radio-label">
                  <input type="radio" name="period" value="YEARLY"
                    checked={formData.period === 'YEARLY'}
                    onChange={e => setFormData({ ...formData, period: e.target.value, month: '', quarter: '' })}
                  /> Yearly
                </label>
              </div>
            </div>
          )}

          {needsMonth && (
            <div className="form-group">
              <label>Month</label>
              <select value={formData.month} onChange={e => setFormData({ ...formData, month: e.target.value })} required>
                <option value="">Select month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {needsQuarter && (
            <div className="form-group">
              <label>Quarter</label>
              <select value={formData.quarter} onChange={e => setFormData({ ...formData, quarter: e.target.value })} required>
                <option value="">Select quarter</option>
                <option value="1">Q1 (Apr–Jun)</option>
                <option value="2">Q2 (Jul–Sep)</option>
                <option value="3">Q3 (Oct–Dec)</option>
                <option value="4">Q4 (Jan–Mar)</option>
              </select>
            </div>
          )}

          {/* Financial Year */}
          {!noYear && (
            <div className="form-group">
              <label>Financial Year</label>
              <input
                type="text"
                placeholder="e.g., 2024-25"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                required
              />
              <small>Format: YYYY-YY (e.g., 2024-25)</small>
            </div>
          )}

          {/* File */}
          <div className="form-group">
            <label>Upload PDF</label>
            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} required />
            <small>Only PDF files (max 10MB)</small>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadDocument;
