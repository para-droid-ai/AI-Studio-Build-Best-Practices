/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { marked } from 'marked';

// Slugify function to create valid IDs from text
const slugify = (text: string) => {
  // Ensure text is not null or undefined before calling toString
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
};

// Custom renderer for Marked to add IDs to headings and handle external links.
const renderer = new marked.Renderer();

// FIX: Updated to use the correct signature for marked v9+
// The arguments are (text, level, raw), where `text` is already parsed HTML
// and `raw` is the raw markdown text.
// @ts-ignore The types for marked's renderer are incorrect. The runtime signature is (text, level, raw).
renderer.heading = (text: string, level: number, raw: string) => {
  const id = slugify(raw);
  return `<h${level} id="${id}">${text}</h${level}>`;
};

// FIX: Updated to use the correct signature for marked v9+
// The arguments are (href, title, text), where `text` is already parsed HTML.
// @ts-ignore The types for marked's renderer are incorrect. The runtime signature is (href, title, text).
renderer.link = (href: string | null, title: string | null, text: string) => {
  // Check if the link is external (starts with http)
  if (href && href.startsWith('http')) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text}</a>`;
  }
  // For internal/anchor links, render as-is
  return `<a href="${href || ''}" title="${title || ''}">${text}</a>`;
};


type Section = { id: string; title: string; level: number; contentSource: ContentSource };
type ContentSource = 'sandbox' | 'docs';

function App() {
  const [content, setContent] = useState({ sandbox: '', docs: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<ContentSource>('sandbox');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const mainContentRef = useRef<HTMLElement>(null);
  const isClickScrolling = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  useEffect(() => {
    const fetchMarkdown = async (source: ContentSource, path: string) => {
        console.log(`[fetchMarkdown] Attempting to fetch: ${path}`);
        const response = await fetch(path);
        if (!response.ok) {
          console.error(`[fetchMarkdown] FAILED to fetch ${path}. Status: ${response.status}`);
          throw new Error(`Failed to load ${path}`);
        }
        console.log(`[fetchMarkdown] Successfully fetched: ${path}`);
        const text = await response.text();
        // Pass the custom renderer directly to the parse function.
        console.log(`[fetchMarkdown] Parsing content for: ${source}`);
        const html = await marked.parse(text, { renderer });
        console.log(`[fetchMarkdown] Successfully parsed content for: ${source}`);
        return {source, html, text};
    };

    const loadAllContent = async () => {
        try {
            console.log('[loadAllContent] Starting to load all markdown content.');
            const results = await Promise.all([
                fetchMarkdown('sandbox', '/Gemini.md'),
                fetchMarkdown('docs', '/OfficialDocs.md')
            ]);
            console.log('[loadAllContent] All markdown files fetched successfully.');

            const newContent: { sandbox: string, docs: string } = { sandbox: '', docs: ''};
            const allSections: Section[] = [];

            results.forEach(result => {
                console.log(`[loadAllContent] Processing sections for: ${result.source}`);
                newContent[result.source] = result.html;
                const headingRegex = /^(#+)\s+(.*)/gm;
                let match;
                while ((match = headingRegex.exec(result.text)) !== null) {
                    const level = match[1].length;
                    if (level <= 2) { // Only H1 and H2 for sidebar
                        const title = match[2];
                        allSections.push({
                            id: slugify(title),
                            title,
                            level,
                            contentSource: result.source
                        });
                    }
                }
            });

            console.log(`[loadAllContent] Extracted ${allSections.length} sections for the sidebar.`);
            setContent(newContent);
            setSections(allSections);

            if (allSections.length > 0) {
                console.log(`[loadAllContent] Setting initial active section to: ${allSections[0].id}`);
                setActiveSection(allSections[0].id);
            }

        } catch (e) {
            console.error('[loadAllContent] A critical error occurred while loading content:', e);
            setError('Failed to load the documentation. Please try refreshing.');
        } finally {
            console.log('[loadAllContent] Content loading process finished.');
            setLoading(false);
        }
    }

    loadAllContent();
  }, []);

  // Effect to add copy buttons after content is rendered/switched
  useEffect(() => {
    if (!mainContentRef.current) return;
    const preElements = mainContentRef.current.querySelectorAll('pre');
    preElements.forEach(pre => {
        if (pre.querySelector('.copy-button')) return;

        const codeText = pre.querySelector('code')?.innerText || '';
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.setAttribute('aria-label', 'Copy code to clipboard');
        button.onclick = () => {
            navigator.clipboard.writeText(codeText).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            });
        };
        pre.appendChild(button);
    });
  }, [content, activeContent]);


  // Effect for IntersectionObserver to track active section on scroll
  useEffect(() => {
    if (sections.length === 0 || !mainContentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: mainContentRef.current,
        rootMargin: "0px 0px -85% 0px",
        threshold: 0,
      }
    );

    const elements = mainContentRef.current.querySelectorAll('h1, h2');
    elements.forEach(el => observer.observe(el));


    return () => {
        elements.forEach(el => observer.unobserve(el));
    };
  }, [sections, activeContent]); // Re-run when content switches

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, section: Section) => {
    e.preventDefault();

    const navigate = () => {
        isClickScrolling.current = true;
        setActiveSection(section.id);
        const element = document.getElementById(section.id);

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.warn(`[Nav Click] Could not find target element with id: ${section.id}`);
        }

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = window.setTimeout(() => {
          isClickScrolling.current = false;
          scrollTimeout.current = null;
        }, 1000);

        // Close sidebar on mobile after navigation
        setIsSidebarOpen(false);
    };

    if (activeContent !== section.contentSource) {
        setActiveContent(section.contentSource);
        setTimeout(navigate, 0);
    } else {
        navigate();
    }
  };


  if (loading) {
    return <div className="loading-container">Loading AI Studio Builder Guidelines...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  const renderSidebarSection = (title: string, source: ContentSource) => (
    <>
        <li className="sidebar-header">{title}</li>
        {sections.filter(s => s.contentSource === source).map(section => (
            <li key={`${section.contentSource}-${section.id}`} style={{ marginLeft: section.level === 2 ? '1rem' : '0' }}>
                <a
                    href={`#${section.id}`}
                    className={activeSection === section.id ? 'active' : ''}
                    onClick={(e) => handleNavClick(e, section)}
                >
                    {section.title}
                </a>
            </li>
        ))}
    </>
  );

  return (
    <div className="app-container">
        {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <h1 className="sidebar-title">AI Studio Builder</h1>
            <nav>
                <ul>
                    {renderSidebarSection('Sandbox Guidelines', 'sandbox')}
                    {renderSidebarSection('Official Gemini Docs', 'docs')}
                </ul>
            </nav>
        </aside>
        <main ref={mainContentRef}>
             <button className="menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation menu">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div className="markdown-body-wrapper">
                <article
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: content[activeContent] }}
                />
            </div>
        </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);