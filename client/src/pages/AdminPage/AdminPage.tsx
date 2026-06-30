import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminApi, type AdminContentItem, type AdminGuest, type AdminGuestUpdatePayload, type AdminInvitation, type MediaAsset } from "../../shared/api/client";

const tokenKey = "wedding-admin-token";

const adminSections = [
  { id: "guests", label: "Гости и приглашения" },
  { id: "envelope", label: "Письмо", keys: ["hero.title"] },
  { id: "intro", label: "Приглашение", keys: ["couple.names", "intro.greeting.single", "intro.greeting.couple", "intro.greeting.family", "intro.typeText.single", "intro.typeText.couple", "intro.typeText.family", "intro.date", "intro.place", "intro.message"] },
  { id: "about", label: "Фото и текст", keys: ["about.text", "family.line"], imageSlot: "couple-main" },
  { id: "story", label: "История" },
  { id: "menu", label: "Меню", keys: ["menu.title", "menu.text"] },
  { id: "gifts", label: "Подарки", keys: ["gift.text", "gift.hint", "gift.bankDetails", "gift.moneyGiftEnabled"] },
  { id: "confirm", label: "Подтверждение", keys: ["confirm.title", "confirm.button"] },
  { id: "questions", label: "Вопросы" },
  { id: "schedule", label: "Расписание" },
  { id: "map", label: "Карта", keys: ["location.mapUrl"] }
] as const;

type AdminSection = (typeof adminSections)[number];
type EditableAdminSection = AdminSection & { keys: readonly string[] };

function hasContentKeys(section: AdminSection | undefined): section is EditableAdminSection {
  return Boolean(section && "keys" in section);
}

export function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? "");
  const [code, setCode] = useState("");
  const [activeSection, setActiveSection] = useState("guests");
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [contentItems, setContentItems] = useState<AdminContentItem[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [internalName, setInternalName] = useState("");
  const [guestType, setGuestType] = useState("single");

  useEffect(() => {
    if (token) {
      refresh(token);
    }
  }, [token]);

  const activeConfig = useMemo(() => adminSections.find((section) => section.id === activeSection), [activeSection]);

  async function refresh(activeToken = token) {
    try {
      const [invitationResponse, guestsResponse, contentResponse, mediaResponse] = await Promise.all([
        adminApi.getInvitations(activeToken),
        adminApi.getGuests(activeToken),
        adminApi.getContent(activeToken),
        adminApi.getMedia(activeToken)
      ]);
      setInvitations(invitationResponse.invitations);
      setGuests(guestsResponse.guests);
      setContentItems(contentResponse.items);
      setMediaAssets(mediaResponse.assets);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось загрузить данные.");
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await adminApi.login(code);
      localStorage.setItem(tokenKey, response.token);
      setToken(response.token);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Ошибка входа.");
    }
  }

  async function createInvitation(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await adminApi.createInvitation(token, { displayName, internalName, guestType });
      setDisplayName("");
      setInternalName("");
      setGuestType("single");
      await navigator.clipboard?.writeText(response.url);
      setMessage(`Приглашение создано: ${response.url}`);
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось создать приглашение.");
    }
  }

  async function saveInvitation(invitation: AdminInvitation, payload: { displayName: string; internalName: string; guestType: string; isActive: boolean }) {
    try {
      await adminApi.updateInvitation(token, invitation.id, payload);
      setMessage("Приглашение сохранено.");
      await refresh();
      return true;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось сохранить приглашение.");
      return false;
    }
  }

  async function saveGuest(guest: AdminGuest, payload: AdminGuestUpdatePayload) {
    try {
      await adminApi.updateGuest(token, guest.id, payload);
      setMessage("Данные гостя сохранены.");
      await refresh();
      return true;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось сохранить гостя.");
      return false;
    }
  }

  async function deleteInvitation(invitation: AdminInvitation) {
    if (!window.confirm(`Удалить приглашение "${invitation.displayName}" и все связанные ответы?`)) return;

    try {
      await adminApi.deleteInvitation(token, invitation.id);
      setMessage("Приглашение удалено.");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось удалить приглашение.");
    }
  }

  async function deleteGuest(guest: AdminGuest) {
    if (!window.confirm(`Удалить ответ для "${guest.invitation.displayName}"?`)) return;

    try {
      await adminApi.deleteGuest(token, guest.id);
      setMessage("Ответ гостя удален.");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось удалить ответ гостя.");
    }
  }

  async function downloadExport() {
    try {
      const blob = await adminApi.exportGuests(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "guests.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось скачать Excel.");
    }
  }

  async function saveContent(keys?: readonly string[], overrides?: AdminContentItem[]) {
    try {
      const source = overrides ?? contentItems;
      const prepared = source
        .filter((item) => !keys || keys.includes(item.key))
        .map((item) => ({
          ...item,
          value: item.type === "json" && typeof item.value === "string" ? JSON.parse(item.value) : item.value
        }));
      await adminApi.updateContent(token, prepared);
      setMessage("Контент сохранен.");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось сохранить контент.");
    }
  }

  async function uploadMedia(file: File, key: string, alt = "") {
    try {
      const response = await adminApi.uploadMedia(token, { file, key, alt });
      setMessage("Фотография загружена.");
      await refresh();
      return response.asset;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Не удалось загрузить фотографию.");
      return null;
    }
  }

  function updateContentItem(key: string, value: unknown) {
    setContentItems((items) => items.map((item) => (item.key === key ? { ...item, value } : item)));
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setToken("");
  }

  if (!token) {
    return (
      <main className="admin-page login-page">
        <form className="login-panel" onSubmit={login}>
          <h1>Админ-панель</h1>
          <label className="field">
            Ключ-код
            <input value={code} onChange={(event) => setCode(event.target.value)} type="password" autoFocus />
          </label>
          <button className="primary-button" type="submit">
            Войти
          </button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <h1>Конструктор</h1>
          <p>Свадебный сайт</p>
        </div>
        <nav>
          {adminSections.map((section) => (
            <button
              className={section.id === activeSection ? "active" : ""}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </nav>
        <button className="ghost-button" onClick={logout}>
          Выйти
        </button>
      </aside>

      <section className="admin-workspace">
        <header className="admin-header">
          <div>
            <h1>{activeConfig?.label ?? "Админ-панель"}</h1>
            <p>Редактируйте блоки лендинга как конструктор страницы.</p>
          </div>
          <button className="ghost-button" onClick={() => refresh()}>
            Обновить
          </button>
        </header>

        {message && <p className="admin-message">{message}</p>}

        {activeSection === "guests" && (
          <GuestsInvitationsPage
            displayName={displayName}
            internalName={internalName}
            guestType={guestType}
            guests={guests}
            invitations={invitations}
            questions={questionsValue(contentItems)}
            onCreate={createInvitation}
            onDisplayName={setDisplayName}
            onExport={downloadExport}
            onGuestType={setGuestType}
            onInternalName={setInternalName}
            onDeleteGuest={deleteGuest}
            onDeleteInvitation={deleteInvitation}
            onSaveGuest={saveGuest}
            onSaveInvitation={saveInvitation}
          />
        )}
        {activeSection === "story" && (
          <StoryEditor
            contentItems={contentItems}
            mediaAssets={mediaAssets}
            onItems={setContentItems}
            onSave={(items) => saveContent(["story.title", "story.items"], items)}
            onUpload={uploadMedia}
          />
        )}
        {activeSection === "questions" && (
          <QuestionsEditor
            contentItems={contentItems}
            onItems={setContentItems}
            onSave={(items) => saveContent(["questions.title", "questions.description", "questions.items", "questions.foodOptions", "questions.alcoholOptions"], items)}
          />
        )}
        {activeSection === "schedule" && (
          <ScheduleEditor
            contentItems={contentItems}
            mediaAssets={mediaAssets}
            onItems={setContentItems}
            onSave={(items) => saveContent(["schedule.title", "schedule.items"], items)}
            onUpload={uploadMedia}
          />
        )}
        {hasContentKeys(activeConfig) && (
          <BlockEditor
            imageSlot={"imageSlot" in activeConfig ? activeConfig.imageSlot : undefined}
            items={contentItems.filter((item) => activeConfig.keys.includes(item.key))}
            mediaAssets={mediaAssets}
            onChange={updateContentItem}
            onSave={() => saveContent(activeConfig.keys)}
            onUpload={uploadMedia}
          />
        )}
      </section>
    </main>
  );
}

function GuestsInvitationsPage({
  displayName,
  internalName,
  guestType,
  guests,
  invitations,
  questions,
  onCreate,
  onDisplayName,
  onExport,
  onGuestType,
  onInternalName,
  onDeleteGuest,
  onDeleteInvitation,
  onSaveGuest,
  onSaveInvitation
}: {
  displayName: string;
  internalName: string;
  guestType: string;
  guests: AdminGuest[];
  invitations: AdminInvitation[];
  questions: QuestionAdminItem[];
  onCreate: (event: FormEvent) => void;
  onDisplayName: (value: string) => void;
  onExport: () => void;
  onGuestType: (value: string) => void;
  onInternalName: (value: string) => void;
  onDeleteGuest: (guest: AdminGuest) => Promise<void>;
  onDeleteInvitation: (invitation: AdminInvitation) => Promise<void>;
  onSaveGuest: (guest: AdminGuest, payload: AdminGuestUpdatePayload) => Promise<boolean>;
  onSaveInvitation: (invitation: AdminInvitation, payload: { displayName: string; internalName: string; guestType: string; isActive: boolean }) => Promise<boolean>;
}) {
  const [editingInvitationId, setEditingInvitationId] = useState<string | null>(null);
  const [invitationDraft, setInvitationDraft] = useState<InvitationDraft | null>(null);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [guestDraft, setGuestDraft] = useState<GuestDraft | null>(null);
  const extraQuestions = questions.filter((question) => question.kind !== "food" && question.kind !== "alcohol");

  function startInvitationEdit(invitation: AdminInvitation) {
    setEditingInvitationId(invitation.id);
    setInvitationDraft({
      displayName: invitation.displayName,
      internalName: invitation.internalName,
      guestType: invitation.guestType,
      isActive: invitation.isActive
    });
  }

  function startGuestEdit(guest: AdminGuest) {
    setEditingGuestId(guest.id);
    setGuestDraft({
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone,
      foodPreferences: guest.foodPreferences.join(", "),
      alcoholPreferences: guest.alcoholPreferences.join(", "),
      questionAnswers: normalizeQuestionAnswers(guest.questionAnswers),
      hasChild: guest.hasChild,
      comment: guest.comment ?? "",
      moneyGiftEnabled: guest.moneyGiftEnabled,
      moneyGiftAmount: guest.moneyGiftAmount ? String(guest.moneyGiftAmount) : ""
    });
  }

  async function submitInvitation(invitation: AdminInvitation) {
    if (!invitationDraft) return;

    const saved = await onSaveInvitation(invitation, invitationDraft);
    if (saved) {
      setEditingInvitationId(null);
      setInvitationDraft(null);
    }
  }

  async function submitGuest(guest: AdminGuest) {
    if (!guestDraft) return;

    const saved = await onSaveGuest(guest, {
      firstName: guestDraft.firstName,
      lastName: guestDraft.lastName,
      phone: guestDraft.phone,
      foodPreferences: splitList(guestDraft.foodPreferences),
      alcoholPreferences: splitList(guestDraft.alcoholPreferences),
      questionAnswers: guestDraft.questionAnswers,
      hasChild: guestDraft.hasChild,
      comment: guestDraft.comment,
      moneyGiftEnabled: guestDraft.moneyGiftEnabled,
      moneyGiftAmount: guestDraft.moneyGiftEnabled ? Number(guestDraft.moneyGiftAmount) || null : null
    });
    if (saved) {
      setEditingGuestId(null);
      setGuestDraft(null);
    }
  }

  return (
    <>
      <div className="admin-grid">
        <form className="admin-panel" onSubmit={onCreate}>
          <h2>Новое приглашение</h2>
          <label className="field">
            Обращение в приглашении
            <input value={displayName} onChange={(event) => onDisplayName(event.target.value)} placeholder="Светлана и Андрей" required />
          </label>
          <label className="field">
            Подсказка о госте
            <input value={internalName} onChange={(event) => onInternalName(event.target.value)} placeholder="Света Иванова и Андрей Петров" />
          </label>
          <label className="field">
            Тип
            <select value={guestType} onChange={(event) => onGuestType(event.target.value)}>
              <option value="single">Один гость</option>
              <option value="couple">Пара</option>
              <option value="family">Семья</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            Создать и скопировать ссылку
          </button>
        </form>

        <section className="admin-panel">
          <div className="panel-heading">
            <h2>Гости</h2>
            <button className="primary-button" type="button" onClick={onExport}>
              Скачать Excel
            </button>
          </div>
          <p className="admin-hint compact">Ответов: {guests.length}. Приглашений: {invitations.length}.</p>
        </section>
      </div>

      <section className="admin-panel">
        <h2>Приглашения</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Подсказка о госте</th>
                <th>Тип</th>
                <th>Ссылка</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => {
                const isEditing = editingInvitationId === invitation.id && invitationDraft;

                return (
                  <tr key={invitation.id}>
                    <td>
                      {isEditing ? (
                        <input value={invitationDraft.displayName} onChange={(event) => setInvitationDraft({ ...invitationDraft, displayName: event.target.value })} />
                      ) : (
                        invitation.displayName
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input value={invitationDraft.internalName} onChange={(event) => setInvitationDraft({ ...invitationDraft, internalName: event.target.value })} />
                      ) : (
                        invitation.internalName || invitation.displayName
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select value={invitationDraft.guestType} onChange={(event) => setInvitationDraft({ ...invitationDraft, guestType: event.target.value })}>
                          <option value="single">Один гость</option>
                          <option value="couple">Пара</option>
                          <option value="family">Семья</option>
                        </select>
                      ) : (
                        invitation.guestType
                      )}
                    </td>
                    <td>
                      <button className="text-button" onClick={() => navigator.clipboard?.writeText(invitation.url)}>
                        {invitation.slug}
                      </button>
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="table-choice">
                          <input type="checkbox" checked={invitationDraft.isActive} onChange={(event) => setInvitationDraft({ ...invitationDraft, isActive: event.target.checked })} />
                          Активно
                        </label>
                      ) : (
                        `${invitation.hasResponse ? "Ответ есть" : "Ждем ответ"}${invitation.isActive ? "" : " / выключено"}`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="table-actions">
                          <button className="text-button" type="button" onClick={() => void submitInvitation(invitation)}>Сохранить</button>
                          <button className="text-button" type="button" onClick={() => setEditingInvitationId(null)}>Отмена</button>
                        </div>
                      ) : (
                        <div className="table-actions">
                          <button className="text-button" type="button" onClick={() => startInvitationEdit(invitation)}>Редактировать</button>
                          <button className="text-button danger" type="button" onClick={() => void onDeleteInvitation(invitation)}>Удалить</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Список гостей</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Приглашение</th>
                <th>Подсказка о госте</th>
                <th>Телефон</th>
                <th>Еда</th>
                <th>Алкоголь</th>
                <th>Ребенок</th>
                <th>Подарок</th>
                <th>Комментарий</th>
                {extraQuestions.map((question) => (
                  <th key={question.id}>{question.label}</th>
                ))}
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => {
                const answers = normalizeQuestionAnswers(guest.questionAnswers);
                const isEditing = editingGuestId === guest.id && guestDraft;

                return (
                  <tr key={guest.id}>
                    <td>{guest.invitation.displayName}</td>
                    <td>{guest.invitation.internalName || guest.invitation.displayName}</td>
                    <td>{isEditing ? <input value={guestDraft.phone} onChange={(event) => setGuestDraft({ ...guestDraft, phone: event.target.value })} /> : guest.phone}</td>
                    <td>{isEditing ? <textarea rows={2} value={guestDraft.foodPreferences} onChange={(event) => setGuestDraft({ ...guestDraft, foodPreferences: event.target.value })} /> : guest.foodPreferences.join(", ")}</td>
                    <td>{isEditing ? <textarea rows={2} value={guestDraft.alcoholPreferences} onChange={(event) => setGuestDraft({ ...guestDraft, alcoholPreferences: event.target.value })} /> : guest.alcoholPreferences.join(", ")}</td>
                    <td>
                      {isEditing ? (
                        <select value={guestDraft.hasChild ? "yes" : "no"} onChange={(event) => setGuestDraft({ ...guestDraft, hasChild: event.target.value === "yes" })}>
                          <option value="yes">Да</option>
                          <option value="no">Нет</option>
                        </select>
                      ) : (
                        guest.hasChild ? "Да" : "Нет"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="table-inline-fields">
                          <label className="table-choice">
                            <input type="checkbox" checked={guestDraft.moneyGiftEnabled} onChange={(event) => setGuestDraft({ ...guestDraft, moneyGiftEnabled: event.target.checked })} />
                            Да
                          </label>
                          <input type="number" min="1" value={guestDraft.moneyGiftAmount} onChange={(event) => setGuestDraft({ ...guestDraft, moneyGiftAmount: event.target.value })} />
                        </div>
                      ) : (
                        guest.moneyGiftEnabled ? `${guest.moneyGiftAmount ?? ""} руб.` : "Нет"
                      )}
                    </td>
                    <td>{isEditing ? <textarea rows={3} value={guestDraft.comment} onChange={(event) => setGuestDraft({ ...guestDraft, comment: event.target.value })} /> : guest.comment ?? ""}</td>
                    {extraQuestions.map((question) => (
                      <td key={`${guest.id}-${question.id}`}>
                        {isEditing ? (
                          <GuestQuestionAnswerEditor
                            question={question}
                            value={guestDraft.questionAnswers[question.id] ?? []}
                            onChange={(value) =>
                              setGuestDraft({
                                ...guestDraft,
                                questionAnswers: {
                                  ...guestDraft.questionAnswers,
                                  [question.id]: value
                                }
                              })
                            }
                          />
                        ) : (
                          (answers[question.id] ?? []).join(", ")
                        )}
                      </td>
                    ))}
                    <td>
                      {isEditing ? (
                        <div className="table-actions">
                          <button className="text-button" type="button" onClick={() => void submitGuest(guest)}>Сохранить</button>
                          <button className="text-button" type="button" onClick={() => setEditingGuestId(null)}>Отмена</button>
                        </div>
                      ) : (
                        <div className="table-actions">
                          <button className="text-button" type="button" onClick={() => startGuestEdit(guest)}>Редактировать</button>
                          <button className="text-button danger" type="button" onClick={() => void onDeleteGuest(guest)}>Удалить</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function BlockEditor({
  items,
  imageSlot,
  mediaAssets,
  onChange,
  onSave,
  onUpload
}: {
  items: AdminContentItem[];
  imageSlot?: string;
  mediaAssets: MediaAsset[];
  onChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onUpload: (file: File, key: string, alt?: string) => Promise<MediaAsset | null>;
}) {
  const imageAsset = imageSlot ? latestAsset(mediaAssets, imageSlot) : undefined;

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <h2>Редактирование блока</h2>
        <button className="primary-button" type="button" onClick={onSave}>
          Сохранить блок
        </button>
      </div>
      <div className="content-editor single-column">
        {items.map((item) => (
          <label className="field" key={item.key}>
            {contentLabel(item.key)}
            {item.key === "gift.moneyGiftEnabled" ? (
              <span className="admin-toggle-row">
                <input
                  type="checkbox"
                  checked={item.value !== false}
                  onChange={(event) => onChange(item.key, event.target.checked)}
                />
                <span>Показывать поле денежного подарка в анкете</span>
              </span>
            ) : (
              <textarea
                rows={item.type === "json" ? 10 : 4}
                value={typeof item.value === "string" ? item.value : JSON.stringify(item.value, null, 2)}
                onChange={(event) => onChange(item.key, event.target.value)}
              />
            )}
            <small>{item.key}</small>
          </label>
        ))}
      </div>
      {imageSlot && (
        <div className="inline-upload">
          <div>
            <strong>Фотография блока</strong>
            <span>Загрузите изображение, оно сразу появится на лендинге после обновления.</span>
          </div>
          {imageAsset && <img src={imageAsset.url} alt={imageAsset.alt ?? "Фотография блока"} />}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onUpload(file, imageSlot, "Фотография блока");
              }
            }}
          />
        </div>
      )}
    </section>
  );
}

function StoryEditor({
  contentItems,
  mediaAssets,
  onItems,
  onSave,
  onUpload
}: {
  contentItems: AdminContentItem[];
  mediaAssets: MediaAsset[];
  onItems: (items: AdminContentItem[]) => void;
  onSave: (items: AdminContentItem[]) => void;
  onUpload: (file: File, key: string, alt?: string) => Promise<MediaAsset | null>;
}) {
  const title = contentValue(contentItems, "story.title", "Наша история");
  const stories = storyValue(contentItems);

  function updateTitle(value: string) {
    onItems(upsertContent(contentItems, "story.title", value, "text"));
  }

  function updateStory(index: number, value: Partial<StoryAdminItem>) {
    onItems(upsertContent(contentItems, "story.items", stories.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)), "json"));
  }

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <h2>История</h2>
        <button className="primary-button" type="button" onClick={() => onSave(upsertContent(contentItems, "story.items", stories, "json"))}>
          Сохранить блок
        </button>
      </div>
      <div className="content-editor single-column">
        <label className="field">
          Заголовок
          <input value={title} onChange={(event) => updateTitle(event.target.value)} />
        </label>
        <div className="builder-list">
          {stories.map((story, index) => (
            <article className="builder-card" key={story.id}>
              <div className="panel-heading">
                <h3>Фотоистория {index + 1}</h3>
                <button className="text-button" type="button" onClick={() => onItems(upsertContent(contentItems, "story.items", stories.filter((_, itemIndex) => itemIndex !== index), "json"))}>
                  Удалить
                </button>
              </div>
              <label className="field">
                Название
                <input value={story.title} onChange={(event) => updateStory(index, { title: event.target.value })} />
              </label>
              <label className="field">
                Текст
                <textarea rows={5} value={story.text} onChange={(event) => updateStory(index, { text: event.target.value })} />
              </label>
              <div className="inline-upload">
                <div>
                  <strong>Фотография</strong>
                  <span>Можно загрузить отдельное фото для этой части истории.</span>
                </div>
                <PreviewImage src={story.imageUrl ?? getAssetByKey(mediaAssets, story.imageKey)?.url} alt={story.title} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const asset = await onUpload(file, `story-${Date.now()}-${index}`, story.title);
                    if (asset) {
                      updateStory(index, { imageUrl: asset.url, imageKey: undefined });
                    }
                  }}
                />
              </div>
            </article>
          ))}
        </div>
        <button className="ghost-button" type="button" onClick={() => onItems(upsertContent(contentItems, "story.items", [...stories, { id: crypto.randomUUID(), title: "Новый момент", text: "", imageUrl: "" }], "json"))}>
          Добавить историю
        </button>
      </div>
    </section>
  );
}

function QuestionsEditor({
  contentItems,
  onItems,
  onSave
}: {
  contentItems: AdminContentItem[];
  onItems: (items: AdminContentItem[]) => void;
  onSave: (items: AdminContentItem[]) => void;
}) {
  const title = contentValue(contentItems, "questions.title", "Анкета гостя");
  const description = contentValue(contentItems, "questions.description", "");
  const questions = questionsValue(contentItems);

  function updateQuestion(index: number, value: Partial<QuestionAdminItem>) {
    onItems(upsertContent(contentItems, "questions.items", questions.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)), "json"));
  }

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <h2>Вопросы</h2>
        <button className="primary-button" type="button" onClick={() => onSave(upsertContent(contentItems, "questions.items", questions, "json"))}>
          Сохранить блок
        </button>
      </div>
      <div className="content-editor single-column">
        <label className="field">
          Заголовок
          <input value={title} onChange={(event) => onItems(upsertContent(contentItems, "questions.title", event.target.value, "text"))} />
        </label>
        <label className="field">
          Описание
          <textarea rows={3} value={description} onChange={(event) => onItems(upsertContent(contentItems, "questions.description", event.target.value, "text"))} />
        </label>
        <div className="builder-list">
          {questions.map((question, index) => (
            <article className="builder-card" key={question.id}>
              <div className="panel-heading">
                <h3>Вопрос {index + 1}</h3>
                <button className="text-button" type="button" onClick={() => onItems(upsertContent(contentItems, "questions.items", questions.filter((_, itemIndex) => itemIndex !== index), "json"))}>
                  Удалить
                </button>
              </div>
              <label className="field">
                Текст вопроса
                <input value={question.label} onChange={(event) => updateQuestion(index, { label: event.target.value })} />
              </label>
              <label className="field">
                Тип вопроса
                <select value={question.type} onChange={(event) => updateQuestion(index, { type: event.target.value as QuestionType })}>
                  <option value="choice">Выбор</option>
                  <option value="text">Текстовое поле</option>
                  <option value="number">Числовое поле</option>
                  <option value="date">Дата</option>
                </select>
              </label>
              {question.type === "choice" && (
                <>
                  <label className="choice">
                    <input type="checkbox" checked={question.multiple} onChange={(event) => updateQuestion(index, { multiple: event.target.checked })} />
                    <span>Можно выбрать несколько ответов</span>
                  </label>
                  <div className="answer-list">
                    {question.options.map((option, optionIndex) => (
                      <div className="answer-row" key={`${question.id}-${optionIndex}`}>
                        <input
                          value={option}
                          onChange={(event) => updateQuestion(index, { options: question.options.map((item, itemIndex) => (itemIndex === optionIndex ? event.target.value : item)) })}
                          placeholder="Вариант ответа"
                        />
                        <button className="text-button" type="button" onClick={() => updateQuestion(index, { options: question.options.filter((_, itemIndex) => itemIndex !== optionIndex) })}>
                          Удалить
                        </button>
                      </div>
                    ))}
                    <button className="ghost-button" type="button" onClick={() => updateQuestion(index, { options: [...question.options, ""] })}>
                      Добавить ответ
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
        <button className="ghost-button" type="button" onClick={() => onItems(upsertContent(contentItems, "questions.items", [...questions, { id: crypto.randomUUID(), label: "Новый вопрос", type: "choice", options: ["Да", "Нет"], multiple: false }], "json"))}>
          Добавить вопрос
        </button>
      </div>
    </section>
  );
}

function ScheduleEditor({
  contentItems,
  mediaAssets,
  onItems,
  onSave,
  onUpload
}: {
  contentItems: AdminContentItem[];
  mediaAssets: MediaAsset[];
  onItems: (items: AdminContentItem[]) => void;
  onSave: (items: AdminContentItem[]) => void;
  onUpload: (file: File, key: string, alt?: string) => Promise<MediaAsset | null>;
}) {
  const title = contentValue(contentItems, "schedule.title", "Свадебное расписание");
  const schedule = scheduleValue(contentItems);

  function updateSchedule(index: number, value: Partial<ScheduleAdminItem>) {
    onItems(upsertContent(contentItems, "schedule.items", schedule.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)), "json"));
  }

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <h2>Расписание</h2>
        <button className="primary-button" type="button" onClick={() => onSave(upsertContent(contentItems, "schedule.items", schedule, "json"))}>
          Сохранить блок
        </button>
      </div>
      <div className="content-editor single-column">
        <label className="field">
          Заголовок
          <input value={title} onChange={(event) => onItems(upsertContent(contentItems, "schedule.title", event.target.value, "text"))} />
        </label>
        <div className="builder-list">
          {schedule.map((item, index) => (
            <article className="builder-card" key={item.id}>
              <div className="panel-heading">
                <h3>Пункт {index + 1}</h3>
                <button className="text-button" type="button" onClick={() => onItems(upsertContent(contentItems, "schedule.items", schedule.filter((_, itemIndex) => itemIndex !== index), "json"))}>
                  Удалить
                </button>
              </div>
              <div className="content-editor">
                <label className="field">
                  Время
                  <input value={item.time} onChange={(event) => updateSchedule(index, { time: event.target.value })} />
                </label>
                <label className="field">
                  Название
                  <input value={item.title} onChange={(event) => updateSchedule(index, { title: event.target.value })} />
                </label>
              </div>
              <label className="field">
                Описание
                <textarea rows={4} value={item.text} onChange={(event) => updateSchedule(index, { text: event.target.value })} />
              </label>
              <div className="inline-upload">
                <div>
                  <strong>Иконка</strong>
                  <span>Загрузите свою иконку или оставьте стандартную.</span>
                </div>
                <PreviewImage src={item.iconUrl ?? getAssetByKey(mediaAssets, item.iconKey)?.url} alt={item.title} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const asset = await onUpload(file, `schedule-${Date.now()}-${index}`, item.title);
                    if (asset) {
                      updateSchedule(index, { iconUrl: asset.url, iconKey: undefined });
                    }
                  }}
                />
              </div>
            </article>
          ))}
        </div>
        <button className="ghost-button" type="button" onClick={() => onItems(upsertContent(contentItems, "schedule.items", [...schedule, { id: crypto.randomUUID(), time: "", title: "Новый пункт", text: "", icon: "rings" }], "json"))}>
          Добавить пункт
        </button>
      </div>
    </section>
  );
}

function contentLabel(key: string) {
  const labels: Record<string, string> = {
    "couple.names": "Имена пары",
    "hero.title": "Текст на письме",
    "intro.greeting.single": "Обращение к одному гостю",
    "intro.greeting.couple": "Обращение к паре",
    "intro.greeting.family": "Обращение к семье",
    "intro.typeText.single": "Текст для одного гостя",
    "intro.typeText.couple": "Текст для пары",
    "intro.typeText.family": "Текст для семьи",
    "intro.date": "Дата",
    "intro.place": "Место",
    "intro.message": "Текст приглашения",
    "about.text": "Основной текст",
    "family.line": "Подпись от пары/семьи",
    "story.title": "Заголовок истории",
    "story.items": "Истории и фото-ключи",
    "menu.title": "Заголовок меню",
    "menu.text": "Текст меню",
    "confirm.title": "Заголовок подтверждения",
    "confirm.button": "Текст кнопки",
    "questions.title": "Заголовок анкеты",
    "questions.description": "Описание анкеты",
    "questions.foodOptions": "Варианты еды",
    "questions.alcoholOptions": "Варианты алкоголя",
    "schedule.title": "Заголовок расписания",
    "schedule.items": "Пункты расписания",
    "location.mapUrl": "Ссылка iframe Яндекс.Карты",
    "gift.text": "Текст о подарках",
    "gift.hint": "Короткая подпись о подарках",
    "gift.bankDetails": "Реквизиты",
    "gift.moneyGiftEnabled": "Денежный подарок",
    "footer.text": "Текст футера"
  };

  return labels[key] ?? key;
}

type StoryAdminItem = { id: string; title: string; text: string; imageUrl?: string; imageKey?: string };
type QuestionType = "choice" | "text" | "number" | "date";
type QuestionAdminItem = { id: string; label: string; options: string[]; multiple: boolean; type: QuestionType; kind?: string };
type ScheduleAdminItem = { id: string; time: string; title: string; text: string; icon: string; iconUrl?: string; iconKey?: string };
type InvitationDraft = { displayName: string; internalName: string; guestType: string; isActive: boolean };
type GuestDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  foodPreferences: string;
  alcoholPreferences: string;
  questionAnswers: Record<string, string[]>;
  hasChild: boolean;
  comment: string;
  moneyGiftEnabled: boolean;
  moneyGiftAmount: string;
};

function contentValue(items: AdminContentItem[], key: string, fallback: string) {
  const value = items.find((item) => item.key === key)?.value;
  return typeof value === "string" ? value : fallback;
}

function upsertContent(items: AdminContentItem[], key: string, value: unknown, type: AdminContentItem["type"]) {
  const exists = items.some((item) => item.key === key);
  if (exists) {
    return items.map((item) => (item.key === key ? { ...item, value, type } : item));
  }

  return [...items, { key, value, type }];
}

function storyValue(items: AdminContentItem[]): StoryAdminItem[] {
  const value = items.find((item) => item.key === "story.items")?.value;
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      title: typeof item.title === "string" ? item.title : `История ${index + 1}`,
      text: typeof item.text === "string" ? item.text : "",
      imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : undefined,
      imageKey: typeof item.imageKey === "string" ? item.imageKey : undefined
    }));
}

function questionsValue(items: AdminContentItem[]): QuestionAdminItem[] {
  const value = items.find((item) => item.key === "questions.items")?.value;
  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item, index) => ({
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        label: typeof item.label === "string" ? item.label : `Вопрос ${index + 1}`,
        options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string") : [],
        multiple: typeof item.multiple === "boolean" ? item.multiple : true,
        type: getQuestionType(item.type),
        kind: typeof item.kind === "string" ? item.kind : undefined
      }));
  }

  const foodOptions = items.find((item) => item.key === "questions.foodOptions")?.value;
  const alcoholOptions = items.find((item) => item.key === "questions.alcoholOptions")?.value;
  return [
    { id: "food", kind: "food", label: "Есть ли у вас особые предпочтения по еде", options: Array.isArray(foodOptions) ? foodOptions.filter((item): item is string => typeof item === "string") : [], multiple: true, type: "choice" },
    { id: "alcohol", kind: "alcohol", label: "Какой алкоголь вы предпочитаете", options: Array.isArray(alcoholOptions) ? alcoholOptions.filter((item): item is string => typeof item === "string") : [], multiple: true, type: "choice" }
  ];
}

function getQuestionType(value: unknown): QuestionType {
  return value === "text" || value === "number" || value === "date" ? value : "choice";
}

function GuestQuestionAnswerEditor({
  question,
  value,
  onChange
}: {
  question: QuestionAdminItem;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  if (question.type === "choice") {
    return (
      <textarea
        rows={2}
        value={value.join(", ")}
        onChange={(event) => onChange(splitList(event.target.value))}
      />
    );
  }

  return (
    <input
      type={question.type === "number" ? "number" : question.type}
      value={value[0] ?? ""}
      onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
    />
  );
}

function scheduleValue(items: AdminContentItem[]): ScheduleAdminItem[] {
  const value = items.find((item) => item.key === "schedule.items")?.value;
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      time: typeof item.time === "string" ? item.time : "",
      title: typeof item.title === "string" ? item.title : `Пункт ${index + 1}`,
      text: typeof item.text === "string" ? item.text : "",
      icon: typeof item.icon === "string" ? item.icon : "rings",
      iconUrl: typeof item.iconUrl === "string" ? item.iconUrl : undefined,
      iconKey: typeof item.iconKey === "string" ? item.iconKey : undefined
    }));
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeQuestionAnswers(value: AdminGuest["questionAnswers"]): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, answers]) => [
      key,
      Array.isArray(answers) ? answers.filter((answer): answer is string => typeof answer === "string") : []
    ])
  );
}

function latestAsset(mediaAssets: MediaAsset[], key: string) {
  return mediaAssets.find((asset) => asset.key === key);
}

function getAssetByKey(mediaAssets: MediaAsset[], key?: string) {
  return key ? mediaAssets.find((asset) => asset.key === key) : undefined;
}

function PreviewImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return <div className="image-placeholder">Нет фото</div>;
  }

  return <img src={src} alt={alt} />;
}
