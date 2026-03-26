'use client';

import React from 'react';
import { HelpCircle, Sparkles, CreditCard, Palette, Video, Zap, Shield, CheckCircle } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="help-container">
      <div className="help-header">
        <div className="help-icon">
          <HelpCircle size={32} />
        </div>
        <div>
          <h1 className="help-title">User Guide</h1>
          <p className="help-subtitle">Everything you need to know about Titan Thumbnail Studio</p>
        </div>
      </div>

      <div className="help-content">
        {/* Quick Start */}
        <section className="help-section">
          <div className="section-header">
            <Zap className="section-icon" size={24} />
            <h2>Quick Start</h2>
          </div>
          <div className="section-content">
            <div className="info-card">
              <h3>🎯 Your First Thumbnail in 3 Steps</h3>
              <ol className="step-list">
                <li><strong>Create a Channel:</strong> Go to "Channels" tab → Click "New Channel" → Enter your channel name and persona description</li>
                <li><strong>Add an Archetype:</strong> Go to "Archetypes" tab → Click "New Archetype" → Upload a reference image and describe the layout</li>
                <li><strong>Generate:</strong> Go to "Generate" tab → Select your channel and archetype → Enter video topic and thumbnail text → Click "Generate"</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Demo Account */}
        <section className="help-section">
          <div className="section-header">
            <Video className="section-icon" size={24} />
            <h2>Demo Account</h2>
          </div>
          <div className="section-content">
            <div className="demo-card">
              <div className="demo-badge">Try It Out!</div>
              <h3>Test Account Available</h3>
              <p>Want to try the platform without signing up? Use our demo account:</p>
              <div className="credentials">
                <div className="credential-row">
                  <span className="label">Email:</span>
                  <code className="value">test@test.ai</code>
                </div>
                <div className="credential-row">
                  <span className="label">Password:</span>
                  <code className="value">See login page</code>
                </div>
              </div>
              <div className="demo-limits">
                <CheckCircle size={16} />
                <span>10 free generations per day</span>
              </div>
              <p className="demo-note">Perfect for exploring features and testing the system!</p>
            </div>
          </div>
        </section>

        {/* Understanding Credits */}
        <section className="help-section">
          <div className="section-header">
            <CreditCard className="section-icon" size={24} />
            <h2>Understanding Credits</h2>
          </div>
          <div className="section-content">
            <div className="info-card">
              <h3>How Credits Work</h3>
              <ul className="feature-list">
                <li><strong>1 Credit = 1 Thumbnail:</strong> Each generation costs exactly 1 credit</li>
                <li><strong>Pay Upfront:</strong> Credits are deducted before generation starts</li>
                <li><strong>No Refunds:</strong> Credits are not refunded if generation fails (to prevent exploitation)</li>
                <li><strong>View Balance:</strong> Your credit balance is shown in the top-right corner of the dashboard</li>
                <li><strong>Check History:</strong> Go to "History" tab to see all your credit transactions</li>
              </ul>

              <div className="tip-box">
                <strong>💡 Tip:</strong> Admin accounts have unlimited credits and don't get charged for generations!
              </div>
            </div>
          </div>
        </section>

        {/* Channels */}
        <section className="help-section">
          <div className="section-header">
            <Video className="section-icon" size={24} />
            <h2>Channels</h2>
          </div>
          <div className="section-content">
            <div className="info-card">
              <h3>What is a Channel?</h3>
              <p>A Channel represents a YouTube channel or brand identity. It contains:</p>
              <ul className="feature-list">
                <li><strong>Persona Description:</strong> A detailed description of your brand's character/avatar (200+ words recommended)</li>
                <li><strong>Consistency:</strong> The same persona appears in all thumbnails for this channel</li>
                <li><strong>Multiple Archetypes:</strong> Each channel can have many layout styles</li>
              </ul>

              <div className="example-box">
                <h4>✍️ Example Persona Description:</h4>
                <p className="example-text">
                  "A 28-year-old male tech reviewer with short brown hair styled in a modern quiff,
                  bright blue eyes, sharp jawline, athletic build wearing a black fitted t-shirt.
                  He has a friendly expression, clean-shaven face, well-defined cheekbones, and stands
                  in a modern studio with soft purple backlighting..."
                </p>
                <p className="example-note">
                  <strong>Pro Tip:</strong> The more specific your description (age, hair, eyes, clothing,
                  expression, lighting), the more consistent your character will be across all thumbnails!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Archetypes */}
        <section className="help-section">
          <div className="section-header">
            <Palette className="section-icon" size={24} />
            <h2>Archetypes</h2>
          </div>
          <div className="section-content">
            <div className="info-card">
              <h3>What is an Archetype?</h3>
              <p>An Archetype is a layout template that defines the visual style of your thumbnails:</p>
              <ul className="feature-list">
                <li><strong>Reference Image:</strong> Upload an example thumbnail showing the desired layout</li>
                <li><strong>Layout Instructions:</strong> Describe the composition, text placement, background style, and effects</li>
                <li><strong>Reusable:</strong> Generate unlimited thumbnails using the same archetype</li>
                <li><strong>Mix & Match:</strong> Combine any channel with any archetype for variety</li>
              </ul>

              <div className="example-box">
                <h4>🎨 Example Archetype Description:</h4>
                <p className="example-text">
                  "Split-screen composition with character on the right side looking shocked,
                  left side showing a glowing laptop screen. Bold white text at the top in impact font
                  with red outline. Purple and blue gradient background with lens flare effect.
                  High-energy, YouTube clickbait style."
                </p>
              </div>

              <div className="tip-box">
                <strong>💡 Best Practice:</strong> Keep your reference image focused on the layout,
                not on specific faces. The persona from your Channel will be inserted automatically!
              </div>
            </div>
          </div>
        </section>

        {/* Generating Thumbnails */}
        <section className="help-section">
          <div className="section-header">
            <Sparkles className="section-icon" size={24} />
            <h2>Generating Thumbnails</h2>
          </div>
          <div className="section-content">
            <div className="info-card">
              <h3>The Generation Process</h3>
              <div className="process-steps">
                <div className="process-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Select Channel & Archetype</h4>
                    <p>Choose which brand identity and layout style to use</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Enter Video Details</h4>
                    <p>Provide the video topic and text you want on the thumbnail</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Generate Variants</h4>
                    <p>Choose how many versions (1-4) you want to generate</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Download & Use</h4>
                    <p>View results in History tab, download the ones you like</p>
                  </div>
                </div>
              </div>

              <div className="limits-box">
                <h4>⚡ Rate Limits</h4>
                <ul className="feature-list">
                  <li>Non-admin users: <strong>10 manual generations per day</strong></li>
                  <li>Each generation takes about 10-30 seconds</li>
                  <li>Failed generations still count toward your daily limit</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Translation Feature */}
        <section className="help-section">
          <div className="section-header">
            <Sparkles className="section-icon" size={24} />
            <h2>Translation Feature</h2>
          </div>
          <div className="section-content">
            <div className="info-card">
              <h3>Create Multilingual Thumbnails</h3>
              <p>The Translate feature lets you generate the same thumbnail design with text in different languages:</p>
              <ul className="feature-list">
                <li><strong>Master Thumbnail:</strong> Generate your base design first</li>
                <li><strong>Add Languages:</strong> Go to "Translate" tab and select languages</li>
                <li><strong>Automatic Translation:</strong> Text is translated and regenerated in the same style</li>
                <li><strong>Credit Cost:</strong> 1 credit per translated variant</li>
              </ul>
              <p className="note">Perfect for channels targeting international audiences!</p>
            </div>
          </div>
        </section>

        {/* History & Tracking */}
        <section className="help-section">
          <div className="section-header">
            <CheckCircle className="section-icon" size={24} />
            <h2>History & Tracking</h2>
          </div>
          <div className="section-content">
            <div className="info-card">
              <h3>View Your Generation History</h3>
              <p>The History tab shows all your thumbnail generations:</p>
              <ul className="feature-list">
                <li><strong>Filter by Status:</strong> View completed, failed, or processing thumbnails</li>
                <li><strong>Download Images:</strong> Click on any thumbnail to download</li>
                <li><strong>Redo Generation:</strong> Recreate a thumbnail with the same settings</li>
                <li><strong>Credit Transactions:</strong> See detailed log of credit usage</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Admin Features */}
        <section className="help-section">
          <div className="section-header">
            <Shield className="section-icon" size={24} />
            <h2>Admin Features</h2>
          </div>
          <div className="section-content">
            <div className="info-card admin-card">
              <h3>🔐 Admin-Only Capabilities</h3>
              <p>If you have admin access, you'll see additional features:</p>
              <ul className="feature-list">
                <li><strong>Admin Panel:</strong> Access via the sidebar (Shield icon)</li>
                <li><strong>User Management:</strong> View all users, search by email</li>
                <li><strong>Grant Credits:</strong> Add credits to any user account</li>
                <li><strong>Transaction History:</strong> View detailed credit transaction logs</li>
                <li><strong>Unlimited Generations:</strong> Admins don't consume credits</li>
                <li><strong>Admin-Only Archetypes:</strong> Create archetypes that only admins can use</li>
                <li><strong>System Statistics:</strong> View total users, jobs, and credit usage</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tips & Best Practices */}
        <section className="help-section">
          <div className="section-header">
            <Sparkles className="section-icon" size={24} />
            <h2>Tips & Best Practices</h2>
          </div>
          <div className="section-content">
            <div className="tips-grid">
              <div className="tip-card">
                <h4>🎯 Consistent Characters</h4>
                <p>Write persona descriptions with 200+ words and 15+ specific attributes (age, hair color, eye color, face shape, clothing, expression, lighting)</p>
              </div>
              <div className="tip-card">
                <h4>🖼️ Clean Reference Images</h4>
                <p>Use archetype images that focus on layout and style, not specific faces. The persona will be inserted automatically.</p>
              </div>
              <div className="tip-card">
                <h4>💬 Clear Thumbnail Text</h4>
                <p>Keep thumbnail text short and impactful (max 100 characters). Use ALL CAPS for emphasis.</p>
              </div>
              <div className="tip-card">
                <h4>🔄 Iterate & Refine</h4>
                <p>Generate multiple variants (1-4) per request to get different takes on the same concept.</p>
              </div>
              <div className="tip-card">
                <h4>📊 Monitor Your Credits</h4>
                <p>Check your credit balance in the top-right corner before starting large generation batches.</p>
              </div>
              <div className="tip-card">
                <h4>⏰ Plan Around Rate Limits</h4>
                <p>Non-admin users have 10 generations/day. Schedule your thumbnail creation accordingly!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="help-section">
          <div className="section-header">
            <HelpCircle className="section-icon" size={24} />
            <h2>Troubleshooting</h2>
          </div>
          <div className="section-content">
            <div className="info-card">
              <h3>Common Issues & Solutions</h3>

              <div className="troubleshooting-item">
                <h4>❌ "Insufficient Credits" Error</h4>
                <p><strong>Solution:</strong> Contact an admin to grant you more credits. Your balance is shown in the top-right corner.</p>
              </div>

              <div className="troubleshooting-item">
                <h4>❌ "Rate Limit Exceeded"</h4>
                <p><strong>Solution:</strong> You've hit the daily limit of 10 generations. Wait 24 hours or ask an admin for assistance.</p>
              </div>

              <div className="troubleshooting-item">
                <h4>❌ Generation Fails</h4>
                <p><strong>Solution:</strong> Check your internet connection. If the issue persists, try with a different archetype or contact support. Note: Credits are not refunded for failed generations.</p>
              </div>

              <div className="troubleshooting-item">
                <h4>❌ Character Doesn't Look Consistent</h4>
                <p><strong>Solution:</strong> Make your persona description more detailed. Include specific physical attributes like hair length, eye color, face shape, and clothing style.</p>
              </div>

              <div className="troubleshooting-item">
                <h4>❌ Can't See My Archetype</h4>
                <p><strong>Solution:</strong> Make sure the archetype is linked to your selected channel. Go to Channels → Edit → Link Archetypes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="help-section">
          <div className="section-header">
            <HelpCircle className="section-icon" size={24} />
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="section-content">
            <div className="faq-list">
              <div className="faq-item">
                <h4>Q: How do I get more credits?</h4>
                <p>A: Contact an admin. They can grant credits via the Admin Panel → Grant Credits section.</p>
              </div>

              <div className="faq-item">
                <h4>Q: Can I edit a thumbnail after it's generated?</h4>
                <p>A: Not within the platform. Download the image and use your preferred image editor (Photoshop, Canva, etc.)</p>
              </div>

              <div className="faq-item">
                <h4>Q: What image formats are supported?</h4>
                <p>A: For uploads: JPG, PNG, WEBP (max 5MB). Generated thumbnails are delivered as PNG files.</p>
              </div>

              <div className="faq-item">
                <h4>Q: Can I use the same archetype for multiple channels?</h4>
                <p>A: Yes! Archetypes can be linked to multiple channels. Each channel will use its own persona description.</p>
              </div>

              <div className="faq-item">
                <h4>Q: How long does generation take?</h4>
                <p>A: Typically 10-30 seconds per thumbnail. Generating 4 variants at once takes proportionally longer.</p>
              </div>

              <div className="faq-item">
                <h4>Q: Are my thumbnails stored forever?</h4>
                <p>A: For non-admin users, the system keeps your last 30 generation jobs. Older jobs are automatically cleaned up. Download important thumbnails to save them permanently!</p>
              </div>

              <div className="faq-item">
                <h4>Q: Can I delete a channel or archetype?</h4>
                <p>A: Yes, but be careful! Deleting a channel will also delete all its archetypes and generation history.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Help */}
        <section className="help-section final-section">
          <div className="section-header">
            <HelpCircle className="section-icon" size={24} />
            <h2>Need More Help?</h2>
          </div>
          <div className="section-content">
            <div className="contact-card">
              <h3>📧 Contact Support</h3>
              <p>If you're still stuck or have questions not covered in this guide:</p>
              <ul className="feature-list">
                <li>Contact your system administrator</li>
                <li>Check the API Docs tab for technical integration details</li>
                <li>Review your generation history for patterns in failed jobs</li>
              </ul>
              <p className="final-note">Happy thumbnail creating! 🎨</p>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .help-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .help-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .help-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .help-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .help-subtitle {
          font-size: 1.125rem;
          color: #94a3b8;
          margin: 0.5rem 0 0;
        }

        .help-content {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .help-section {
          scroll-margin-top: 2rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .section-icon {
          color: #3b82f6;
        }

        .section-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .info-card, .demo-card, .contact-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 2rem;
        }

        .info-card h3, .demo-card h3, .contact-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 1rem;
        }

        .info-card p, .demo-card p, .contact-card p {
          color: #cbd5e1;
          line-height: 1.7;
          margin: 0 0 1rem;
        }

        .info-card p:last-child, .demo-card p:last-child {
          margin-bottom: 0;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 1rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .feature-list li {
          color: #cbd5e1;
          padding-left: 1.5rem;
          position: relative;
          line-height: 1.6;
        }

        .feature-list li::before {
          content: "→";
          position: absolute;
          left: 0;
          color: #3b82f6;
          font-weight: bold;
        }

        .feature-list strong {
          color: #f8fafc;
          font-weight: 600;
        }

        .step-list {
          list-style: none;
          counter-reset: step-counter;
          padding: 0;
          margin: 1rem 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .step-list li {
          counter-increment: step-counter;
          padding-left: 3rem;
          position: relative;
          color: #cbd5e1;
          line-height: 1.7;
        }

        .step-list li::before {
          content: counter(step-counter);
          position: absolute;
          left: 0;
          top: 0;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 0.875rem;
        }

        .demo-card {
          position: relative;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .demo-badge {
          position: absolute;
          top: -12px;
          right: 2rem;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .credentials {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .credential-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .credential-row .label {
          color: #94a3b8;
          font-weight: 600;
          min-width: 80px;
        }

        .credential-row .value {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-family: 'Monaco', 'Courier New', monospace;
          color: #3b82f6;
          font-size: 0.9375rem;
        }

        .demo-limits {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          color: #22c55e;
          font-weight: 600;
          margin: 1rem 0;
        }

        .demo-note {
          color: #94a3b8;
          font-size: 0.9375rem;
          font-style: italic;
        }

        .example-box {
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1.5rem 0;
        }

        .example-box h4 {
          color: #c4b5fd;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 1rem;
        }

        .example-text {
          color: #e0e7ff;
          font-style: italic;
          line-height: 1.7;
          margin: 0 0 1rem;
        }

        .example-note {
          color: #cbd5e1;
          font-size: 0.9375rem;
          margin: 0;
        }

        .tip-box {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          color: #fbbf24;
          margin: 1.5rem 0 0;
        }

        .tip-box strong {
          color: #fcd34d;
        }

        .limits-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1.5rem 0 0;
        }

        .limits-box h4 {
          color: #fca5a5;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 1rem;
        }

        .process-steps {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin: 1.5rem 0;
        }

        .process-step {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .step-number {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
        }

        .step-content h4 {
          color: #f8fafc;
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
        }

        .step-content p {
          color: #94a3b8;
          margin: 0;
          line-height: 1.6;
        }

        .tips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }

        .tip-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .tip-card h4 {
          color: #f8fafc;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 0.75rem;
        }

        .tip-card p {
          color: #cbd5e1;
          font-size: 0.9375rem;
          line-height: 1.6;
          margin: 0;
        }

        .admin-card {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .troubleshooting-item {
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.2);
          border-left: 3px solid #3b82f6;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .troubleshooting-item:last-child {
          margin-bottom: 0;
        }

        .troubleshooting-item h4 {
          color: #f8fafc;
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.75rem;
        }

        .troubleshooting-item p {
          color: #cbd5e1;
          line-height: 1.6;
          margin: 0;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .faq-item {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .faq-item h4 {
          color: #3b82f6;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 0.75rem;
        }

        .faq-item p {
          color: #cbd5e1;
          line-height: 1.6;
          margin: 0;
        }

        .final-section {
          margin-bottom: 4rem;
        }

        .final-note {
          color: #3b82f6;
          font-weight: 600;
          font-size: 1.125rem;
          margin-top: 1.5rem !important;
        }

        .note {
          color: #94a3b8;
          font-size: 0.9375rem;
          font-style: italic;
          margin-top: 0.75rem;
        }

        @media (max-width: 768px) {
          .help-header {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }

          .help-title {
            font-size: 2rem;
          }

          .tips-grid {
            grid-template-columns: 1fr;
          }

          .process-step {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
