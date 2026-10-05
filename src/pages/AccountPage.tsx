import { Dispatch, FormEvent, SetStateAction } from "react";
import { CircleHelp, Shield } from "lucide-react";
import { User } from "../types/auth";
import { Avatar, EmptyState } from "../components/common";
import MyPostsList from "../components/MyPostsList";
import { Post } from "../types/domain";
type Props = { identity?: User; posts: Post[]; loadingPosts: boolean; onSavePost: (post: Post, updates: { title: string; content: string; tags: string[] }) => Promise<Post | undefined>; onDeletePost: (post: Post) => void; profileEditing: boolean; setProfileEditing: Dispatch<SetStateAction<boolean>>; uploadAvatar: (event: FormEvent<HTMLFormElement>) => void; updateAccount: (event: FormEvent<HTMLFormElement>) => void; profileForm: { fullName: string; email: string; password: string }; setProfileForm: Dispatch<SetStateAction<{ fullName: string; email: string; password: string }>> };

export default function AccountPage(props: Props) {
  const { identity, posts, loadingPosts, onSavePost, onDeletePost, profileEditing, setProfileEditing, uploadAvatar, updateAccount, profileForm, setProfileForm } = props;
  return (
<>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Your Discere identity</p>
                  <h1>Account settings</h1>
                  <p className="subheading">
                    Manage the profile information connected to your account.
                  </p>
                </div>
              </div>
              {!identity?.id ? (
                <EmptyState
                  icon={<CircleHelp size={21} />}
                  title="Account details are unavailable"
                  text="Your profile could not be loaded from the authenticated session."
                />
              ) : (
                <div className="account-settings panel">
                  <div className="account-profile-head">
                    <Avatar user={identity} size="lg" />
                    <div>
                      <strong>{identity.fullName}</strong>
                      <span className="muted">@{identity.username}</span>
                    </div>
                    <button
                      className="button button-quiet button-small"
                      onClick={() => setProfileEditing(!profileEditing)}
                    >
                      {profileEditing ? "Cancel" : "Edit details"}
                    </button>
                  </div>
                  <form className="avatar-upload" onSubmit={uploadAvatar}>
                    <label>
                      Profile image
                      <input
                        name="avatar"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        required
                      />
                    </label>
                    <button className="button button-secondary button-small">
                      Upload image
                    </button>
                    <small>JPEG, PNG, WebP, or GIF · up to 5 MB</small>
                  </form>
                  {profileEditing && (
                    <form
                      className="form-stack account-form"
                      onSubmit={updateAccount}
                    >
                      <label>
                        Full name
                        <input
                          required
                          maxLength={120}
                          value={profileForm.fullName}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              fullName: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          required
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              email: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        New password
                        <input
                          type="password"
                          minLength={10}
                          placeholder="Leave blank to keep current password"
                          value={profileForm.password}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              password: e.target.value,
                            })
                          }
                        />
                      </label>
                      <button className="button button-primary">
                        Save changes
                      </button>
                    </form>
                  )}
                  <section className="my-posts-section">
                    <div className="my-posts-heading"><h2>My Posts</h2><span className="muted">{posts.length}</span></div>
                    <MyPostsList posts={posts} loading={loadingPosts} onSave={onSavePost} onDelete={onDeletePost} />
                  </section>
                  <div className="account-security">
                    <Shield size={16} />
                    <span>
                      Your session is protected by an HTTP-only cookie.
                    </span>
                  </div>
                </div>
              )}
            </>
  );
}
