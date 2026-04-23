import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import MapPicker from '../components/MapPicker';

const CATEGORIES = [
  { value: 'pothole', label: 'Pothole', icon: '🕳️' },
  { value: 'garbage', label: 'Garbage', icon: '🗑️' },
  { value: 'streetlight', label: 'Street Light', icon: '💡' },
  { value: 'waterleakage', label: 'Water Leakage', icon: '💧' },
  { value: 'encroachment', label: 'Encroachment', icon: '🚧' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
];

const SubmitReport = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'medium',
  });
  const [location, setLocation] = useState(null);
  const [images, setImages] = useState([]); // preview files
  const [uploadedImages, setUploadedImages] = useState([]); // {url, publicId}
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1=details, 2=location, 3=photos

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Dropzone
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length + images.length > 5) {
      return toast.error('Max 5 images allowed');
    }
    const previews = acceptedFiles.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...previews]);

    // Upload to Cloudinary immediately
    setUploading(true);
    try {
      const fd = new FormData();
      acceptedFiles.forEach((f) => fd.append('images', f));
      const { data } = await axios.post('/api/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedImages((prev) => [...prev, ...data.images]);
      toast.success(`${data.images.length} image(s) uploaded`);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 5,
  });

  const removeImage = async (index) => {
    const img = uploadedImages[index];
    if (img?.publicId) {
      try {
        await axios.delete(`/api/upload/${encodeURIComponent(img.publicId)}`);
      } catch {}
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) {
      toast.error('Please complete all required fields');
      return setStep(1);
    }
    if (!location) {
      toast.error('Please select a location on the map');
      return setStep(2);
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        location: {
          coordinates: [location.lng, location.lat],
          address: location.address,
        },
        images: uploadedImages,
      };
      const { data } = await axios.post('/api/reports', payload);
      toast.success('Report submitted successfully! 🎉');
      navigate(`/report/${data.report._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { n: 1, label: 'Details', icon: '📝' },
    { n: 2, label: 'Location', icon: '📍' },
    { n: 3, label: 'Photos', icon: '📸' },
  ];

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <div>
          <h1>Submit a Report</h1>
          <p>Report a community issue and help your neighborhood</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, maxWidth: 500 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <button
              onClick={() => setStep(s.n)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  background: step >= s.n ? 'var(--accent-gradient)' : 'var(--bg-card)',
                  border: `2px solid ${step >= s.n ? 'transparent' : 'var(--border)'}`,
                  boxShadow: step === s.n ? '0 0 20px rgba(99,102,241,0.4)' : 'none',
                  transition: 'all 0.3s',
                }}
              >
                {step > s.n ? '✓' : s.icon}
              </div>
              <span style={{ fontSize: 12, color: step >= s.n ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500 }}>
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: step > s.n ? 'var(--accent)' : 'var(--border)',
                  marginBottom: 28,
                  transition: 'background 0.3s',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="submit-form-grid">
          {/* Main form area */}
          <div>
            {/* Step 1: Details */}
            {step === 1 && (
              <div className="card fade-in">
                <h3 style={{ marginBottom: 24 }}>📝 Report Details</h3>

                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    className="form-input"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Brief description of the problem"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-textarea"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Provide detailed info: size, duration, danger level..."
                    rows={4}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <div className="category-grid">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat.value })}
                        style={{
                          padding: '14px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${form.category === cat.value ? 'var(--accent)' : 'var(--border)'}`,
                          background: form.category === cat.value ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                          color: form.category === cat.value ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          textTransform: 'capitalize',
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm({ ...form, priority: p.value })}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: 'var(--radius-sm)',
                          border: `2px solid ${form.priority === p.value ? p.color : 'var(--border)'}`,
                          background: form.priority === p.value ? `${p.color}15` : 'var(--bg-secondary)',
                          color: form.priority === p.value ? p.color : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 13,
                          transition: 'all 0.2s',
                          textTransform: 'capitalize',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setStep(2)}
                  disabled={!form.title || !form.description || !form.category}
                >
                  Next: Pick Location →
                </button>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="card fade-in">
                <h3 style={{ marginBottom: 8 }}>📍 Select Location</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                  Click on the map to drop a pin at the problem location.
                </p>
                <MapPicker value={location} onChange={setLocation} />
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setStep(3)}
                    disabled={!location}
                  >
                    Next: Add Photos →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Photos */}
            {step === 3 && (
              <div className="card fade-in">
                <h3 style={{ marginBottom: 8 }}>📸 Add Photos</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                  Add up to 5 photos. This helps authorities assess the issue faster.
                </p>

                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  style={{
                    border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragActive ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                    transition: 'all 0.2s',
                    marginBottom: 16,
                  }}
                >
                  <input {...getInputProps()} />
                  <div style={{ fontSize: 40, marginBottom: 12 }}>
                    {isDragActive ? '📂' : '📁'}
                  </div>
                  <p style={{ color: isDragActive ? 'var(--accent)' : 'var(--text-muted)', fontSize: 14 }}>
                    {isDragActive
                      ? 'Drop images here...'
                      : 'Drag & drop images here, or click to select'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    PNG, JPG, WEBP · Max 10MB each · Up to 5 images
                  </p>
                </div>

                {/* Image previews */}
                {images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                    {images.map((img, i) => (
                      <div key={i} style={{ position: 'relative', paddingBottom: '100%' }}>
                        <img
                          src={img.preview}
                          alt={`preview ${i}`}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: 'rgba(0,0,0,0.6)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✕
                        </button>
                        {!uploadedImages[i] && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            <div className="spinner" style={{ width: 20, height: 20 }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || uploading}
                  >
                    {submitting ? (
                      <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting...</>
                    ) : (
                      '🚀 Submit Report'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Summary */}
          <div style={{ position: 'sticky', top: 88 }}>
            <div className="card">
              <h4 style={{ marginBottom: 16, fontSize: 15 }}>📋 Summary</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Title</p>
                  <p style={{ fontSize: 14, color: form.title ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {form.title || '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Category</p>
                  <p style={{ fontSize: 14, color: form.category ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {form.category || '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Priority</p>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {form.priority}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Location</p>
                  <p style={{ fontSize: 13, color: location ? 'var(--green)' : 'var(--text-muted)', lineHeight: 1.4 }}>
                    {location ? `📍 ${location.address?.slice(0, 60)}...` : '— Not selected'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Photos</p>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {uploadedImages.length} / 5 uploaded
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubmitReport;
