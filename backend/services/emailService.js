const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const statusColors = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  resolved: '#10B981',
  rejected: '#EF4444',
};

const statusLabels = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const sendStatusUpdateEmail = async (user, report) => {
  if (!user?.email) return;

  const color = statusColors[report.status] || '#6B7280';
  const label = statusLabels[report.status] || report.status;
  const reportUrl = `${process.env.CLIENT_URL}/report/${report._id}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#0F172A;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#1E293B;border-radius:16px;overflow:hidden;border:1px solid #334155;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🏘️ CivicAlert</h1>
                  <p style="color:#C7D2FE;margin:8px 0 0;font-size:14px;">Local Community Problem Reporting</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="color:#94A3B8;margin:0 0 8px;font-size:14px;">Hello ${user.name},</p>
                  <h2 style="color:#F1F5F9;margin:0 0 24px;font-size:20px;">Your report status has been updated</h2>

                  <!-- Report Card -->
                  <div style="background:#0F172A;border-radius:12px;padding:24px;margin:0 0 24px;border:1px solid #334155;">
                    <p style="color:#94A3B8;margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Report</p>
                    <h3 style="color:#F1F5F9;margin:0 0 16px;font-size:18px;">${report.title}</h3>
                    <p style="color:#94A3B8;margin:0 0 4px;font-size:13px;">Category: <span style="color:#CBD5E1;">${report.category}</span></p>
                    <p style="color:#94A3B8;margin:0;font-size:13px;">New Status: 
                      <span style="background:${color}20;color:${color};padding:3px 10px;border-radius:100px;font-size:12px;font-weight:600;">${label}</span>
                    </p>
                  </div>

                  ${
                    report.statusHistory?.length
                      ? `<div style="background:#0F172A;border-radius:12px;padding:20px;margin:0 0 24px;border:1px solid #334155;">
                          <p style="color:#94A3B8;margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Latest Note</p>
                          <p style="color:#CBD5E1;margin:0;font-size:14px;line-height:1.6;">${report.statusHistory[report.statusHistory.length - 1]?.note || 'No additional notes.'}</p>
                        </div>`
                      : ''
                  }

                  <a href="${reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;">View Report →</a>

                  <p style="color:#475569;margin:32px 0 0;font-size:12px;line-height:1.6;">
                    You received this email because you submitted a report on CivicAlert.<br>
                    If you have questions, reply to this email.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#0F172A;padding:20px 40px;border-top:1px solid #1E293B;">
                  <p style="color:#475569;margin:0;font-size:12px;text-align:center;">© ${new Date().getFullYear()} CivicAlert — Local Community Problem Reporting System</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"CivicAlert" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: `Report Update: "${report.title}" is now ${label}`,
    html,
  });
};

const sendWelcomeEmail = async (user) => {
  if (!user?.email) return;

  await transporter.sendMail({
    from: `"CivicAlert" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Welcome to CivicAlert!',
    html: `
      <div style="font-family:Arial,sans-serif;background:#0F172A;color:#F1F5F9;padding:40px;">
        <h1>Welcome, ${user.name}! 👋</h1>
        <p>You've successfully registered on CivicAlert.</p>
        <p>Start reporting community issues and help make your neighborhood better.</p>
        <a href="${process.env.CLIENT_URL}" style="background:#6366F1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:16px;">Get Started →</a>
      </div>
    `,
  });
};

module.exports = { sendStatusUpdateEmail, sendWelcomeEmail };
