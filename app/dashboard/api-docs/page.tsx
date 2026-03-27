'use client';

import { BlurFade } from '@/app/dashboard/components/ui/blur-fade';
import { Code, Terminal, Zap, Database, Image as ImageIcon } from 'lucide-react';

export default function APIDocsPage() {
    return (
        <div className="docs-container">
            <BlurFade delay={0.1}>
                <div className="view-header">
                    <h2 className="view-title">API Documentation</h2>
                    <p className="view-subtitle">Complete REST API reference for headless thumbnail generation</p>
                </div>
            </BlurFade>

            <div className="docs-content">
                {/* Authentication Section */}
                <section className="docs-section glass">
                    <div className="section-header">
                        <Zap size={18} />
                        <h3>Authentication</h3>
                    </div>
                    <p>All API requests require authentication via HTTP Basic Auth or an active session cookie.</p>
                    <pre><code>{`# Using Basic Auth
curl -X POST https://your-domain.com/api/generate \\
  -u "your-email@example.com:your-password" \\
  -H "Content-Type: application/json" \\
  -d '{"channelId": "cm123", "archetypeId": "cm456", ...}'`}</code></pre>
                    <p className="note"><b>Note:</b> Test accounts do not have API access. Only verified user and admin accounts can use the API.</p>
                </section>

                {/* Credit System */}
                <section className="docs-section glass" style={{ background: 'rgba(250, 204, 21, 0.05)', border: '1px solid rgba(250, 204, 21, 0.2)' }}>
                    <div className="section-header">
                        <Code size={18} />
                        <h3>Credit System & Pricing</h3>
                    </div>
                    <div className="pricing-info">
                        <p><strong>Standard Pricing:</strong> 1 credit per thumbnail generation</p>
                        <p><strong>Fallback Model Pricing:</strong> 3 credits per thumbnail when stable fallback is used</p>

                        <div className="pricing-details" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <h4 style={{ marginTop: 0 }}>How Fallback Pricing Works:</h4>
                            <p>The system uses a fallback chain of AI models for reliability:</p>
                            <ol style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
                                <li><strong>Nano Banana 2 (Primary):</strong> 1 credit - Fast and cost-effective</li>
                                <li><strong>Nano Banana Pro (Fallback #1):</strong> 1 credit - Used if primary is unavailable</li>
                                <li><strong>Nano Banana OG (Fallback #2):</strong> <span style={{ color: '#facc15', fontWeight: 'bold' }}>3 credits</span> - Stable but 3x more expensive due to API pricing</li>
                            </ol>
                            <p style={{ marginTop: '1rem' }}><strong>⚠️ Important:</strong> When high demand or maintenance causes the primary models to be unavailable, the system automatically uses the stable OG model. This triggers the 3x credit charge to cover the increased API costs. The job response will include a <code>fallbackUsed</code> flag and <code>fallbackMessage</code> explaining which model was used.</p>
                        </div>

                        <p className="note" style={{ marginTop: '1rem' }}><b>Legal Notice:</b> By using this API, you acknowledge that credit charges may vary (1-3 credits) depending on which AI model is available at the time of generation. All credit deductions are final and non-refundable.</p>
                    </div>
                </section>

                {/* Generation Endpoints */}
                <section className="docs-section glass">
                    <div className="section-header">
                        <ImageIcon size={18} />
                        <h3>Thumbnail Generation</h3>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method post">POST</span>
                            <span className="url">/api/generate</span>
                        </div>
                        <p className="desc">Generate a new AI thumbnail for a YouTube video.</p>
                        <div className="code-block">
                            <div className="block-label">Request</div>
                            <pre><code>{`{
  "channelId": "cm123...",           // Required: Channel ID
  "archetypeId": "cm456...",         // Required: Archetype/layout ID
  "videoTopic": "How to code in TypeScript", // Required: Max 200 chars
  "thumbnailText": "TYPESCRIPT GUIDE",       // Required: Max 100 chars
  "customPrompt": "string",          // Optional: Override default prompt
  "versionCount": 1,                 // Optional: 1-4 variants (default: 1)
  "includeBrandColors": true,        // Optional: Include channel colors
  "includePersona": true             // Optional: Include persona description
}`}</code></pre>
                        </div>
                        <div className="code-block">
                            <div className="block-label">Response (201)</div>
                            <pre><code>{`{
  "success": true,
  "jobs": [
    {
      "id": "cm789...",
      "status": "completed",
      "outputUrl": "https://your-r2-bucket.com/generated/cm789.png",
      "channelId": "cm123...",
      "archetypeId": "cm456...",
      "videoTopic": "How to code in TypeScript",
      "thumbnailText": "TYPESCRIPT GUIDE"
    }
  ]
}`}</code></pre>
                        </div>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method post">POST</span>
                            <span className="url">/api/generate/translate</span>
                        </div>
                        <p className="desc">Generate translated thumbnail variants in multiple languages.</p>
                        <div className="code-block">
                            <div className="block-label">Request (Option 1: From Existing Job)</div>
                            <pre><code>{`{
  "masterJobId": "cm789...",         // Existing completed job ID
  "targetLanguages": ["German", "Spanish", "French"]
}`}</code></pre>
                        </div>
                        <div className="code-block">
                            <div className="block-label">Request (Option 2: From Uploaded Images)</div>
                            <pre><code>{`{
  "uploadedImages": [
    "https://your-r2-bucket.com/assets/image1.png",
    "https://your-r2-bucket.com/assets/image2.png"
  ],
  "originalText": "CLICK NOW",      // Text to translate
  "targetLanguages": ["Japanese", "Korean"]
}`}</code></pre>
                        </div>
                        <div className="code-block">
                            <div className="block-label">Response (200)</div>
                            <pre><code>{`{
  "success": true,
  "message": "Generated 3/3 translations successfully",
  "results": [
    { "language": "German", "success": true, "jobId": "cm801..." },
    { "language": "Spanish", "success": true, "jobId": "cm802..." },
    { "language": "French", "success": true, "jobId": "cm803..." }
  ]
}`}</code></pre>
                        </div>
                    </div>
                </section>

                {/* Jobs Endpoints */}
                <section className="docs-section glass">
                    <div className="section-header">
                        <Database size={18} />
                        <h3>Job Management</h3>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method get">GET</span>
                            <span className="url">/api/jobs?channelId=xxx&status=xxx&limit=30</span>
                        </div>
                        <p className="desc">List all generation jobs for the authenticated user.</p>
                        <div className="code-block">
                            <div className="block-label">Query Parameters</div>
                            <ul className="param-list">
                                <li><code>channelId</code> (optional): Filter by channel ID</li>
                                <li><code>status</code> (optional): Filter by status (pending, processing, completed, failed)</li>
                                <li><code>limit</code> (optional): Max number of results</li>
                            </ul>
                        </div>
                        <div className="code-block">
                            <div className="block-label">Response (200)</div>
                            <pre><code>{`{
  "jobs": [
    {
      "id": "cm789...",
      "status": "completed",
      "outputUrl": "https://...",
      "channel": { "id": "cm123", "name": "My Channel" },
      "archetype": { "id": "cm456", "name": "Bold Impact" },
      "videoTopic": "...",
      "thumbnailText": "...",
      "createdAt": "2026-03-13T10:30:00.000Z"
    }
  ]
}`}</code></pre>
                        </div>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method get">GET</span>
                            <span className="url">/api/jobs/[id]</span>
                        </div>
                        <p className="desc">Get details of a specific generation job.</p>
                        <div className="code-block">
                            <div className="block-label">Response (200)</div>
                            <pre><code>{`{
  "job": {
    "id": "cm789...",
    "status": "completed",
    "outputUrl": "https://...",
    "errorMessage": null,
    "createdAt": "2026-03-13T10:30:00.000Z",
    "completedAt": "2026-03-13T10:30:15.000Z",
    "channel": { "id": "cm123", "name": "My Channel" },
    "archetype": { "id": "cm456", "name": "Bold Impact" }
  }
}`}</code></pre>
                        </div>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method get">GET</span>
                            <span className="url">/api/history</span>
                        </div>
                        <p className="desc">Get the last 30 manual generation jobs (excludes translation jobs).</p>
                        <div className="code-block">
                            <div className="block-label">Response (200)</div>
                            <pre><code>{`[
  {
    "id": "cm789...",
    "status": "completed",
    "isManual": true,
    "outputUrl": "https://...",
    "channel": { "id": "cm123", "name": "My Channel" },
    "archetype": { "id": "cm456", "name": "Bold Impact", "imageUrl": "https://..." },
    "videoTopic": "...",
    "thumbnailText": "...",
    "createdAt": "2026-03-13T10:30:00.000Z"
  }
]`}</code></pre>
                        </div>
                    </div>
                </section>

                {/* Channels Endpoints */}
                <section className="docs-section glass">
                    <div className="section-header">
                        <Database size={18} />
                        <h3>Channel Management</h3>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method get">GET</span>
                            <span className="url">/api/channels</span>
                        </div>
                        <p className="desc">List all channels owned by the authenticated user.</p>
                        <div className="code-block">
                            <div className="block-label">Response (200)</div>
                            <pre><code>{`{
  "channels": [
    {
      "id": "cm123...",
      "name": "My Tech Channel",
      "personaDescription": "A 28-year-old male software engineer...",
      "primaryColor": "#FF6B6B",
      "secondaryColor": "#4ECDC4",
      "tags": "tech,programming,tutorial",
      "_count": {
        "archetypes": 5,
        "generationJobs": 42
      }
    }
  ]
}`}</code></pre>
                        </div>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method post">POST</span>
                            <span className="url">/api/channels</span>
                        </div>
                        <p className="desc">Create a new channel.</p>
                        <div className="code-block">
                            <div className="block-label">Request</div>
                            <pre><code>{`{
  "name": "My New Channel",          // Required
  "personaDescription": "Detailed 200+ word persona description...", // Required
  "primaryColor": "#FF6B6B",         // Optional (default: #ffffff)
  "secondaryColor": "#4ECDC4",       // Optional (default: #000000)
  "tags": "tech,gaming"              // Optional
}`}</code></pre>
                        </div>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method patch">PATCH</span>
                            <span className="url">/api/channels/[id]</span>
                        </div>
                        <p className="desc">Update an existing channel.</p>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method delete">DELETE</span>
                            <span className="url">/api/channels/[id]</span>
                        </div>
                        <p className="desc">Delete a channel (cascades to archetypes and jobs).</p>
                    </div>
                </section>

                {/* Archetypes Endpoints */}
                <section className="docs-section glass">
                    <div className="section-header">
                        <Database size={18} />
                        <h3>Archetype Management</h3>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method get">GET</span>
                            <span className="url">/api/archetypes?channelId=xxx</span>
                        </div>
                        <p className="desc">List all archetypes, optionally filtered by channel.</p>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method post">POST</span>
                            <span className="url">/api/archetypes</span>
                        </div>
                        <p className="desc">Create a new archetype.</p>
                        <div className="code-block">
                            <div className="block-label">Request</div>
                            <pre><code>{`{
  "name": "Bold Impact",             // Required
  "imageUrl": "https://...",         // Required: Reference image URL
  "channelIds": ["cm123", "cm456"],  // Optional: Array of channel IDs
  "layoutInstructions": "Center the persona with bold text...", // Optional
  "basePrompt": "Create a dramatic...", // Optional
  "category": "Dramatic"             // Optional (default: General)
}`}</code></pre>
                        </div>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method patch">PATCH</span>
                            <span className="url">/api/archetypes/[id]</span>
                        </div>
                        <p className="desc">Update an existing archetype.</p>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method delete">DELETE</span>
                            <span className="url">/api/archetypes/[id]</span>
                        </div>
                        <p className="desc">Delete an archetype.</p>
                    </div>
                </section>

                {/* Upload Endpoint */}
                <section className="docs-section glass">
                    <div className="section-header">
                        <ImageIcon size={18} />
                        <h3>File Upload</h3>
                    </div>

                    <div className="endpoint-item">
                        <div className="endpoint-header">
                            <span className="method post">POST</span>
                            <span className="url">/api/upload</span>
                        </div>
                        <p className="desc">Upload an image file to cloud storage (R2).</p>
                        <div className="code-block">
                            <div className="block-label">Request (multipart/form-data)</div>
                            <pre><code>{`FormData:
  file: [Binary file data]          // Required: JPG, PNG, or WEBP (max 5MB)
  folder: "archetypes"               // Optional: Storage folder (default: archetypes)`}</code></pre>
                        </div>
                        <div className="code-block">
                            <div className="block-label">Response (200)</div>
                            <pre><code>{`{
  "success": true,
  "url": "https://your-r2-bucket.com/archetypes/1234567890-image.png",
  "filename": "1234567890-image.png"
}`}</code></pre>
                        </div>
                    </div>
                </section>

                {/* Code Examples */}
                <section className="docs-section glass">
                    <div className="section-header">
                        <Terminal size={18} />
                        <h3>Code Examples</h3>
                    </div>

                    <div className="code-example">
                        <h4>Python</h4>
                        <pre><code>{`import requests

# Generate a thumbnail
response = requests.post(
    "https://your-domain.com/api/generate",
    auth=("your-email@example.com", "your-password"),
    json={
        "channelId": "cm123abc",
        "archetypeId": "cm456def",
        "videoTopic": "10 Python Tips Every Developer Needs",
        "thumbnailText": "PYTHON TIPS",
        "versionCount": 1
    }
)

if response.status_code == 201:
    job = response.json()["jobs"][0]
    print(f"Generated: {job['outputUrl']}")
else:
    print(f"Error: {response.json()['error']}")`}</code></pre>
                    </div>

                    <div className="code-example">
                        <h4>cURL</h4>
                        <pre><code>{`curl -X POST https://your-domain.com/api/generate \\
  -u "your-email@example.com:your-password" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channelId": "cm123abc",
    "archetypeId": "cm456def",
    "videoTopic": "Ultimate Guide to Next.js 15",
    "thumbnailText": "NEXT.JS 15"
  }'`}</code></pre>
                    </div>

                    <div className="code-example">
                        <h4>JavaScript (Node.js)</h4>
                        <pre><code>{`const response = await fetch("https://your-domain.com/api/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Basic " + Buffer.from("email:password").toString("base64")
  },
  body: JSON.stringify({
    channelId: "cm123abc",
    archetypeId: "cm456def",
    videoTopic: "Mastering TypeScript Generics",
    thumbnailText: "TS GENERICS"
  })
});

const data = await response.json();
console.log(data.jobs[0].outputUrl);`}</code></pre>
                    </div>
                </section>

                {/* Rate Limits */}
                <section className="docs-section glass">
                    <div className="section-header">
                        <Zap size={18} />
                        <h3>Rate Limits</h3>
                    </div>
                    <ul className="rate-limit-list">
                        <li><b>USER Role:</b> 10 manual generations per day</li>
                        <li><b>ADMIN Role:</b> Unlimited generations</li>
                        <li><b>Translation Jobs:</b> Not counted toward daily limit</li>
                        <li><b>Test Accounts:</b> No API access</li>
                    </ul>
                    <p className="note">Rate limits reset daily at midnight UTC.</p>
                </section>
            </div>

            <style jsx>{`
                .docs-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .view-header {
                    margin-bottom: 2rem;
                }

                .view-title {
                    font-size: 2.25rem;
                    font-weight: 800;
                    color: #fff;
                }

                .view-subtitle {
                    color: var(--muted-foreground);
                    margin-top: 0.5rem;
                }

                .docs-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .docs-section {
                    padding: 2rem;
                    border-radius: var(--radius);
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    color: #fff;
                }

                .section-header h3 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                .docs-section > p {
                    color: var(--muted-foreground);
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }

                .endpoint-item {
                    margin-bottom: 2rem;
                    padding: 1.5rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                }

                .endpoint-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .method {
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .method.post {
                    background: #fff;
                    color: #000;
                }

                .method.get {
                    background: #27272a;
                    color: #fff;
                }

                .method.patch {
                    background: #3b82f6;
                    color: #fff;
                }

                .method.delete {
                    background: #ef4444;
                    color: #fff;
                }

                .url {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.9rem;
                    color: #fff;
                }

                .desc {
                    font-size: 0.875rem;
                    color: var(--muted-foreground);
                    margin: 0.75rem 0;
                }

                .code-block {
                    margin: 1rem 0;
                }

                .block-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.5rem;
                }

                pre {
                    background: #000;
                    padding: 1rem;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    overflow-x: auto;
                    border: 1px solid var(--border);
                    margin: 0;
                }

                code {
                    color: #a1a1aa;
                    font-family: 'JetBrains Mono', monospace;
                }

                .param-list {
                    margin: 0;
                    padding-left: 1.5rem;
                    color: var(--muted-foreground);
                }

                .param-list li {
                    margin-bottom: 0.5rem;
                }

                .param-list code {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.125rem 0.375rem;
                    border-radius: 4px;
                    font-size: 0.85rem;
                }

                .note {
                    background: rgba(255, 255, 255, 0.05);
                    border-left: 3px solid #3b82f6;
                    padding: 1rem;
                    margin-top: 1rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    color: var(--muted-foreground);
                }

                .code-example {
                    margin-bottom: 2rem;
                }

                .code-example h4 {
                    margin: 0 0 0.75rem 0;
                    font-size: 1rem;
                    color: #fff;
                }

                .rate-limit-list {
                    margin: 0;
                    padding-left: 1.5rem;
                    color: var(--muted-foreground);
                    line-height: 1.8;
                }

                .rate-limit-list li {
                    margin-bottom: 0.5rem;
                }

                @media (max-width: 768px) {
                    .docs-section {
                        padding: 1.5rem;
                    }

                    .view-title {
                        font-size: 1.75rem;
                    }
                }
            `}</style>
        </div>
    );
}
