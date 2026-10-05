import { Dispatch, FormEvent, SetStateAction } from "react";
import { ArrowRight, LogIn, Send, Sparkles } from "lucide-react";
import { JobResult, View } from "../types/domain";
type Props = { authenticated: boolean; setAuthOpen: (open: boolean) => void; askQuestion: (event: FormEvent<HTMLFormElement>) => void; aiQuestion: string; setAiQuestion: Dispatch<SetStateAction<string>>; aiWaiting: boolean; aiJob?: JobResult; setView: (view: View) => void; setQuery: Dispatch<SetStateAction<string>> };

export default function StudyPage(props: Props) {
  const { authenticated, setAuthOpen, askQuestion, aiQuestion, setAiQuestion, aiWaiting, aiJob, setView, setQuery } = props;
  return (
<>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Bring a question to the table</p>
                  <h1>Discere AI</h1>
                  <p className="subheading">
                    Ask about ideas shared in the community or get a post
                    summary.
                  </p>
                </div>
                <div className="ai-mark">
                  <Sparkles size={22} />
                </div>
              </div>
              {!authenticated && (
                <div className="soft-notice">
                  <LogIn size={16} />
                  <span>Sign in to ask a question.</span>
                  <button
                    className="text-button"
                    onClick={() => setAuthOpen(true)}
                  >
                    Sign in
                  </button>
                </div>
              )}
              <section className="ai-intro panel">
                <div className="ai-intro-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <strong>A study partner, grounded in shared posts</strong>
                  <p>
                    Discere AI uses posts in the community as context. Answers
                    may take a few moments while your request is processed.
                  </p>
                </div>
              </section>
              <form className="ai-prompt panel" onSubmit={askQuestion}>
                <label htmlFor="question">
                  What would you like to understand?
                </label>
                <textarea
                  id="question"
                  rows={4}
                  maxLength={2000}
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask a question about a topic or concept…"
                />
                <div className="prompt-footer">
                  <span className="muted">{aiQuestion.length}/2000</span>
                  <button
                    className="button button-primary"
                    disabled={!aiQuestion.trim() || aiWaiting}
                  >
                    <Send size={15} /> {aiWaiting ? "Working…" : "Ask Discere"}
                  </button>
                </div>
              </form>
              {aiWaiting && (
                <div className="job-status panel">
                  <span className="spinner" />
                  <div>
                    <strong>Thinking through community knowledge</strong>
                    <p className="muted">
                      This can take a little while. You can stay on this page.
                    </p>
                  </div>
                </div>
              )}
              {aiJob?.result && (
                <article className="answer-card panel">
                  <div className="answer-label">
                    <Sparkles size={15} /> COMMUNITY ANSWER
                  </div>
                  <p>
                    {aiJob.result.answer ||
                      aiJob.result.summary ||
                      "The request completed."}
                  </p>
                  {aiJob.result.relatedPosts?.length ? (
                    <div className="related-posts">
                      <strong>Related posts</strong>
                      {aiJob.result.relatedPosts.map((post) => (
                        <button
                          key={post.id}
                          className="related-link"
                          onClick={() => {
                            setView("feed");
                            setQuery("");
                          }}
                        >
                          {post.title}
                          <ArrowRight size={14} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              )}
              {aiJob?.state === "failed" && (
                <div className="inline-alert">
                  The request failed. Please try again.
                </div>
              )}
            </>
  );
}
