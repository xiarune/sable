import React from "react";
import { useLocation } from "react-router-dom";
import { contactApi } from "../api";
import "./FAQ.css";

const FAQ_SECTIONS = [
  {
    id: "general",
    title: "General",
    questions: [
      {
        q: "What is Sable?",
        a: "Sable is a creative writing platform where you can share and discover original stories, fanfiction, and creative works. Think of it as a community-driven library where writers share their passion."
      },
      {
        q: "Is Sable free to use?",
        a: "Yes! Sable is completely free to read and publish works. We believe creative writing should be accessible to everyone."
      },
      {
        q: "How do I create an account?",
        a: "Click the 'Log In' button in the navigation bar, then select 'Sign Up'. You can register with your email or continue with Google."
      },
    ]
  },
  {
    id: "writing",
    title: "Writing & Publishing",
    questions: [
      {
        q: "How do I publish a work?",
        a: "Go to New Draft from the navigation, write your content, fill in the required fields (genre is required), and click 'Post' to publish. You can save drafts and come back to them later."
      },
      {
        q: "Can I edit my published works?",
        a: "Yes! Go to Your Works in your profile and click 'Edit' on any work to make changes."
      },
      {
        q: "What's the difference between Genre and Fandom?",
        a: "Genre describes the type of story (Romance, Fantasy, Mystery, etc.). Fandom is optional and used when your work is based on an existing property like a book, movie, or TV show. Original works can leave fandom blank or set it to 'Original Work'."
      },
    ]
  },
  {
    id: "skins",
    title: "Skins & Customization",
    questions: [
      {
        q: "What are skins?",
        a: "Skins are visual themes that change how your work appears to readers. When you select a skin in the editor, readers will see that theme when viewing your work."
      },
      {
        q: "What skins are available?",
        a: "Sable includes two built-in skins: 'Default' (the classic warm Sable look) and 'Parchment' (a warmer cream theme with sepia accents). You can select these when creating or editing a work."
      },
      {
        q: "How do I create a custom skin?",
        a: "Go to Settings > Skins and click 'New Skin'. You can write custom CSS to style various elements of the work view page. See the tutorial below for more details."
      },
    ]
  },
  {
    id: "privacy",
    title: "Privacy & Safety",
    questions: [
      {
        q: "Can I make my works private?",
        a: "Yes! When creating or editing a work, use the Privacy option to choose: Public (everyone), Following (only your followers), or Private (only you)."
      },
      {
        q: "How do I block someone?",
        a: "Go to Settings > Privacy > Blocked Users. You can also block users directly from their profile page."
      },
      {
        q: "How do I report inappropriate content?",
        a: "Click the report button (flag icon) on any work or comment. Our moderation team reviews all reports within 24-48 hours."
      },
    ]
  },
];

export default function FAQ() {
  const location = useLocation();
  const [openItems, setOpenItems] = React.useState({});

  // Contact form state
  const [contactName, setContactName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactSubject, setContactSubject] = React.useState("");
  const [contactMessage, setContactMessage] = React.useState("");
  const [contactLoading, setContactLoading] = React.useState(false);
  const [contactSuccess, setContactSuccess] = React.useState(false);
  const [contactError, setContactError] = React.useState("");

  // Scroll to section if hash is present
  React.useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location.hash]);

  function toggleItem(sectionId, idx) {
    const key = `${sectionId}-${idx}`;
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    setContactError("");
    setContactSuccess(false);
    setContactLoading(true);

    try {
      await contactApi.send(contactName, contactEmail, contactSubject, contactMessage);
      setContactSuccess(true);
      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
    } catch (err) {
      setContactError(err.message || "Failed to send message. Please try again.");
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <div className="faq-page">
      <div className="faq-shell">
        <header className="faq-header">
          <h1 className="faq-title">Frequently Asked Questions</h1>
          <p className="faq-subtitle">
            Find answers to common questions about Sable. Can't find what you're looking for?{" "}
            <a href="#contact" className="faq-contactLink">Contact us</a>.
          </p>
        </header>

        <nav className="faq-toc" aria-label="FAQ sections">
          {FAQ_SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="faq-tocLink">
              {section.title}
            </a>
          ))}
          <a href="#contact" className="faq-tocLink">Contact Us</a>
        </nav>

        <div className="faq-content">
          {FAQ_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="faq-section" aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="faq-sectionTitle">{section.title}</h2>

              <div className="faq-questions">
                {section.questions.map((item, idx) => {
                  const key = `${section.id}-${idx}`;
                  const isOpen = openItems[key];

                  return (
                    <div key={idx} className={`faq-item ${isOpen ? "faq-item--open" : ""}`}>
                      <button
                        type="button"
                        className="faq-question"
                        onClick={() => toggleItem(section.id, idx)}
                        aria-expanded={isOpen}
                      >
                        <span className="faq-questionText">{item.q}</span>
                        <span className="faq-questionIcon" aria-hidden="true">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="faq-answer">
                          <p>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Custom Skin Tutorial */}
          <section id="skin-tutorial" className="faq-section faq-section--tutorial">
            <h2 className="faq-sectionTitle">Creating Custom Skins: A Tutorial</h2>

            <div className="faq-tutorial">
              <p>
                Custom skins let you style how readers see your work. Here's how to create one:
              </p>

              <h3>Step 1: Open the Skin Editor</h3>
              <p>Go to <strong>Settings &gt; Skins</strong> and click the <strong>+ New Skin</strong> button.</p>

              <h3>Step 2: Name Your Skin</h3>
              <p>Give your skin a memorable name (e.g., "Midnight Dark" or "Forest Theme").</p>

              <h3>Step 3: Choose Where It Applies</h3>
              <p>Select whether your skin applies to <strong>Works</strong> (the reading view) or <strong>Community Page</strong>.</p>

              <h3>Step 4: Write Your CSS</h3>
              <p>
                Use CSS to customize colors, fonts, and layouts. Here are some common selectors for work skins:
              </p>

              <div className="faq-codeBlock">
                <pre>{`/* Change the background color */
.wv-shell {
  background: #1a1a2e;
}

/* Style the main content card */
.wv-card {
  background: #16213e;
  color: #e8e8e8;
}

/* Customize the title */
.wv-title {
  color: #0f3460;
  font-family: Georgia, serif;
}

/* Style the chapter body text */
.wv-chBody {
  color: #d4d4d4;
  line-height: 1.9;
  font-size: 17px;
}`}</pre>
              </div>

              <h3>Step 5: Save and Use</h3>
              <p>
                Click <strong>Save Skin</strong>. Your custom skin will now appear in the Skin dropdown when editing works.
              </p>

              <h3>Tips</h3>
              <ul>
                <li>Test your skin on different screen sizes</li>
                <li>Ensure text is readable against your background colors</li>
                <li>Use CSS variables from built-in skins as a starting point</li>
                <li>Keep accessibility in mind - maintain good color contrast</li>
              </ul>
            </div>
          </section>

          {/* Contact Form */}
          <section id="contact" className="faq-section faq-section--contact">
            <h2 className="faq-sectionTitle">Contact Us</h2>

            <div className="faq-contactForm">
              <p className="faq-contactIntro">
                Have a question, suggestion, or need help? Send us a message and we'll get back to you as soon as possible.
              </p>

              {contactSuccess ? (
                <div className="faq-contactSuccess">
                  <div className="faq-contactSuccessIcon">✓</div>
                  <div className="faq-contactSuccessText">
                    Your message has been sent! We'll get back to you soon.
                  </div>
                  <button
                    type="button"
                    className="faq-contactNewBtn"
                    onClick={() => setContactSuccess(false)}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="faq-form">
                  {contactError && (
                    <div className="faq-contactError">{contactError}</div>
                  )}

                  <div className="faq-formRow">
                    <label className="faq-formLabel" htmlFor="contact-name">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      className="faq-formInput"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div className="faq-formRow">
                    <label className="faq-formLabel" htmlFor="contact-email">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className="faq-formInput"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div className="faq-formRow">
                    <label className="faq-formLabel" htmlFor="contact-subject">
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      className="faq-formInput"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="What is this about?"
                      required
                    />
                  </div>

                  <div className="faq-formRow">
                    <label className="faq-formLabel" htmlFor="contact-message">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      className="faq-formTextarea"
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Tell us more..."
                      rows={5}
                      required
                      minLength={10}
                    />
                  </div>

                  <button
                    type="submit"
                    className="faq-formSubmit"
                    disabled={contactLoading}
                  >
                    {contactLoading ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
