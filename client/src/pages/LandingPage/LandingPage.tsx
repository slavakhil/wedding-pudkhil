import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { publicApi, type ContentMap, type Invitation, type MediaAsset } from "../../shared/api/client";
import { useCountdown } from "../../shared/lib/useCountdown";
import { ChoiceGroup } from "../../shared/ui/ChoiceGroup";

const fallbackFoodOptions = ["нет", "не ем мясо", "не ем рыбу", "вегетарианец"];
const fallbackAlcoholOptions = [
  "Красное вино",
  "Белое вино",
  "Шампанское",
  "Виски/коньяк",
  "Водка",
  "Не буду пить алкоголь"
];

const fallbackGallery = [
  "/assets/Gallery_Photo_1.png",
  "/assets/Gallery_Photo_2.png",
  "/assets/Gallery_Photo_3.png",
  "/assets/Gallery_Photo_4.png",
  "/assets/Gallery_Photo_5.png",
  "/assets/Gallery_Photo_6.png"
];

const weddingIconAssets = {
  photoBorder: "/assets/border.svg",
  menu: "/assets/wedding-icons/menu.svg",
  envelope: "/assets/wedding-icons/envelope.svg",
  scheduleDivider: "/assets/wedding-icons/schedule-divider.svg",
  rings: "/assets/wedding-icons/schedule-registration.svg",
  camera: "/assets/wedding-icons/schedule-photoshoot.svg",
  dinner: "/assets/wedding-icons/menu.svg",
  firework: "/assets/wedding-icons/schedule-finale.svg"
} as const;

const storySlideGapPx = 18;

const fallbackSchedule = [
  ["13:30", "Торжественная регистрация", "Приглашаем всех разделить с нами такой торжественный момент.", "rings"],
  ["15:00", "Фотосессия", "До банкета у вас будет время, чтобы узнать друг друга поближе и пофотографироваться.", "camera"],
  ["16:00", "Праздничный банкет", "Время пролетит незаметно за фуршетом и общением с другими гостями.", "dinner"],
  ["23:00", "Окончание праздничного дня", "Даже такой день может когда-то подойти к концу.", "firework"]
] as const;

type PersonalForm = {
  phone: string;
};

type QuestionItem = {
  id: string;
  label: string;
  options: string[];
  multiple: boolean;
  type: QuestionType;
  kind?: string;
};

type QuestionType = "choice" | "text" | "number" | "date";

export function LandingPage() {
  const { slug = "" } = useParams();
  const countdown = useCountdown();
  const rsvpSectionRef = useRef<HTMLElement | null>(null);
  const storyViewportRef = useRef<HTMLDivElement | null>(null);
  const storyDragStartRef = useRef<number | null>(null);
  const storyDragDeltaRef = useRef(0);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [content, setContent] = useState<ContentMap>({});
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string[]>>({});
  const [hasChild, setHasChild] = useState(false);
  const [comment, setComment] = useState("");
  const [moneyGiftEnabled, setMoneyGiftEnabled] = useState(false);
  const [moneyGiftAmount, setMoneyGiftAmount] = useState("");
  const [personal, setPersonal] = useState<PersonalForm>({ phone: "" });
  const [submitMessage, setSubmitMessage] = useState("");
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyDragOffset, setStoryDragOffset] = useState(0);
  const [storyIsDragging, setStoryIsDragging] = useState(false);
  const [envelopeState, setEnvelopeState] = useState<"sealed" | "opening" | "opened">("sealed");
  const [envelopeHintLeaving, setEnvelopeHintLeaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInvitationPage() {
      setLoading(true);
      setError("");

      try {
        const invitationResponse = await publicApi.getInvitation(slug);
        const [contentResponse, mediaResponse] = await Promise.all([publicApi.getContent(), publicApi.getMedia()]);

        if (!isMounted) return;

        setInvitation(invitationResponse);
        setContent(contentResponse.items);
        setMedia(mediaResponse.assets);
      } catch (caught) {
        if (!isMounted) return;
        setError(caught instanceof Error ? caught.message : "Такого приглашения не найдено.");
        setInvitation(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInvitationPage();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const gallery = useMemo(
    () =>
      fallbackGallery.map((fallback, index) => ({
        src: getAssetUrl(media, `gallery-${index + 1}`) ?? fallback,
        alt: getAsset(media, `gallery-${index + 1}`)?.alt ?? "Свадебная фотография"
      })),
    [media]
  );
  const storyItems = getStoryItems(content);
  const foodOptions = getStringList(content, "questions.foodOptions", fallbackFoodOptions);
  const alcoholOptions = getStringList(content, "questions.alcoholOptions", fallbackAlcoholOptions);
  const questions = getQuestionItems(content, foodOptions, alcoholOptions);
  const scheduleItems = getScheduleItems(content);
  const envelopeTitle = splitEnvelopeTitle(contentText(content, "hero.title", "Приглашение на свадьбу"));
  const moneyGiftAvailable = contentBoolean(content, "gift.moneyGiftEnabled", true);

  useEffect(() => {
    if (!moneyGiftAvailable) {
      setMoneyGiftEnabled(false);
      setMoneyGiftAmount("");
    }
  }, [moneyGiftAvailable]);

  function openQuestions() {
    setQuestionsOpen(true);
    window.setTimeout(() => {
      rsvpSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function openEnvelope() {
    if (envelopeState !== "sealed" || envelopeHintLeaving) return;

    window.dispatchEvent(new Event("wedding:prime-audio"));
    setEnvelopeHintLeaving(true);
    window.setTimeout(() => {
      setEnvelopeState("opening");
      window.setTimeout(() => {
        setEnvelopeState("opened");
        window.dispatchEvent(new Event("wedding:play-audio"));
      }, 980);
    }, 520);
  }

  function selectStory(index: number) {
    setActiveStoryIndex(index);
  }

  function shiftStory(direction: -1 | 1) {
    if (storyItems.length === 0) return;

    setActiveStoryIndex((index) => (index + direction + storyItems.length) % storyItems.length);
  }

  function handleStoryPointerDown(event: PointerEvent<HTMLElement>) {
    storyDragStartRef.current = event.clientX;
    storyDragDeltaRef.current = 0;
    setStoryIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleStoryPointerMove(event: PointerEvent<HTMLElement>) {
    if (storyDragStartRef.current === null) return;

    const width = storyViewportRef.current?.clientWidth ?? 1;
    const delta = event.clientX - storyDragStartRef.current;
    const boundedDelta = Math.max(-width * 0.92, Math.min(delta, width * 0.92));
    storyDragDeltaRef.current = boundedDelta;
    setStoryDragOffset((boundedDelta / width) * 100);
  }

  function handleStoryPointerEnd() {
    const delta = storyDragDeltaRef.current;
    storyDragStartRef.current = null;
    storyDragDeltaRef.current = 0;
    setStoryDragOffset(0);
    setStoryIsDragging(false);

    if (Math.abs(delta) < 48) return;
    shiftStory(delta < 0 ? 1 : -1);
  }

  async function openPersonalModal(event: FormEvent) {
    event.preventDefault();

    const shouldSendMoneyGift = moneyGiftAvailable && moneyGiftEnabled;

    if (shouldSendMoneyGift && !moneyGiftAmount) {
      setSubmitMessage("Укажите сумму денежного подарка.");
      return;
    }

    setSubmitMessage("");

    if (!shouldSendMoneyGift) {
      await submitRsvp(event, {
        phone: `invite-${invitation?.slug ?? slug}`
      });
      return;
    }

    setModalOpen(true);
  }

  async function submitRsvp(event: FormEvent, personalOverride?: PersonalForm) {
    event.preventDefault();

    if (!invitation) return;

    try {
      const normalizedQuestionAnswers = normalizeQuestionAnswers(questions, questionAnswers);
      const foodAnswer = getTypedQuestionAnswer(questions, normalizedQuestionAnswers, "food") ?? [];
      const alcoholAnswer = getTypedQuestionAnswer(questions, normalizedQuestionAnswers, "alcohol") ?? [];

      await publicApi.sendRsvp({
        invitationSlug: invitation.slug,
        ...(personalOverride ?? personal),
        foodPreferences: foodAnswer,
        alcoholPreferences: alcoholAnswer,
        questionAnswers: normalizedQuestionAnswers,
        hasChild,
        comment,
        moneyGiftEnabled: moneyGiftAvailable && moneyGiftEnabled,
        moneyGiftAmount: moneyGiftAvailable && moneyGiftEnabled ? Number(moneyGiftAmount) : undefined
      });

      setModalOpen(false);
      setSubmitMessage(
        moneyGiftAvailable && moneyGiftEnabled
          ? `Спасибо! Данные сохранены. ${contentText(content, "gift.bankDetails", "Реквизиты будут добавлены позже.")}`
          : "Спасибо! Мы сохранили ваше подтверждение."
      );
    } catch (caught) {
      setSubmitMessage(caught instanceof Error ? caught.message : "Не удалось отправить форму.");
    }
  }

  if (loading) {
    return <main className="center-screen"></main>;
  }

  if (error || !invitation) {
    return (
      <main className="center-screen not-found-page">
        <section>
          <h1>Приглашение не найдено</h1>
          <p>{error || "Такого приглашения не существует или ссылка больше не активна."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`landing postcard-layout landing-${envelopeState} ${envelopeHintLeaving ? "landing-hint-leaving" : ""}`}>
      {envelopeState !== "opened" && (
        <section className="envelope-hero" aria-label="Приглашение на свадьбу">
          <button
            className="envelope-card envelope-trigger"
            disabled={envelopeState === "opening" || envelopeHintLeaving}
            onClick={openEnvelope}
            type="button"
          >
            <img src="/assets/closed-envelope-card.png" alt="" />
            <div className="envelope-title">
              <span>{envelopeTitle[0]}</span>
              <strong>{envelopeTitle[1]}</strong>
            </div>
          </button>
          <div className="envelope-click-hint" aria-hidden="true">
            <span className="envelope-click-arrow">↑</span>
            <span>Нажми на письмо</span>
          </div>
        </section>
      )}

      {envelopeState === "opened" && (
        <div className="landing-content">
      <section className="paper-section wedding-intro-section reveal-section">
        <div className="wedding-intro-card">
          <div className="intro-photo-side">
            <div className="intro-photo-wrap">
              <div className="intro-photo-frame">
                <img src={getAssetUrl(media, "couple-main") ?? gallery[0].src} alt="Жених и невеста" />
              </div>
              <img className="intro-photo-border intro-photo-border-bottom" src={weddingIconAssets.photoBorder} alt="" />
              <img className="intro-photo-border intro-photo-border-top" src={weddingIconAssets.photoBorder} alt="" />
            </div>
          </div>

          <div className="intro-content-side">
            <p className="intro-kicker">{getGreeting(content, invitation)}</p>
            <h2 className="intro-guest-name">{invitation.displayName}!</h2>
            <p className="intro-message">{contentText(content, "intro.message", "приглашаем вас разделить с нами радость главного события в нашей жизни.")}</p>
            <p className="intro-about-text">{contentText(content, "about.text", "")}</p>
            <div className="intro-heart-rule">
              <span />
              <HeartIcon />
              <span />
            </div>
            <div className="intro-details">
              <div>
                <CalendarIcon />
                <span>{contentText(content, "intro.date", "пятница, 21 августа 2026")}</span>
              </div>
              <div>
                <PinIcon />
                <span>{contentText(content, "intro.place", "Рестобар \"Кубик\", г. Якутск, ул. Аржакова, 10")}</span>
              </div>
            </div>
            <p className="intro-type-text">{getTypeText(content, invitation)}</p>
          </div>

          <div className="countdown wedding-countdown" aria-label="Таймер до свадьбы">
            <TimeBox value={countdown.days} label="дней" />
            <TimeBox value={countdown.hours} label="часов" />
            <TimeBox value={countdown.minutes} label="минут" />
            <TimeBox value={countdown.seconds} label="секунд" />
          </div>
        </div>
      </section>

      <section className="paper-section story-section reveal-section">
        <DividerTitle title={contentText(content, "story.title", "Наша история")} />
        {storyItems.length > 0 && (
          <div className="story-carousel">
            <div
              className="story-viewport"
              ref={storyViewportRef}
              onPointerCancel={handleStoryPointerEnd}
              onPointerDown={handleStoryPointerDown}
              onPointerLeave={handleStoryPointerEnd}
              onPointerMove={handleStoryPointerMove}
              onPointerUp={handleStoryPointerEnd}
            >
              <div
                className={`story-track ${storyIsDragging ? "dragging" : ""}`}
                style={{
                  transform: `translateX(calc(${-activeStoryIndex * 100}% - ${activeStoryIndex * storySlideGapPx}px + ${storyDragOffset}%))`
                }}
              >
                {storyItems.map((item, index) => {
                  const photo = getStoryPhoto(item, index, media, gallery);
                  return (
                    <article className="story-slide" key={`${item.title}-${index}`}>
                      <div className="story-slide-photo">
                        <img src={photo.src} alt={photo.alt} draggable={false} />
                        <div className="story-arrows">
                          <button
                            className="story-arrow story-arrow-prev"
                            onClick={() => shiftStory(-1)}
                            onPointerDown={(event) => event.stopPropagation()}
                            type="button"
                            aria-label="Предыдущая история"
                          >
                            <ArrowLeftIcon />
                          </button>
                          <button
                            className="story-arrow story-arrow-next"
                            onClick={() => shiftStory(1)}
                            onPointerDown={(event) => event.stopPropagation()}
                            type="button"
                            aria-label="Следующая история"
                          >
                            <ArrowRightIcon />
                          </button>
                        </div>
                      </div>
                      <div className="story-slide-content">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="story-dots" aria-label="Навигация по историям">
              {storyItems.map((item, index) => (
                <button
                  aria-label={`Открыть историю ${index + 1}: ${item.title}`}
                  className={index === activeStoryIndex ? "active" : ""}
                  key={`${item.title}-dot-${index}`}
                  onClick={() => selectStory(index)}
                  type="button"
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="paper-section menu-section reveal-section">
        <DividerTitle title={contentText(content, "menu.title", "Меню")} />
        <div className="section-icon section-icon-frame" aria-hidden="true">
          <img className="image-section-icon" src={weddingIconAssets.menu} alt="" />
        </div>
        <p>{contentText(content, "menu.text", "Меню разнообразно, поэтому сообщите нам заранее, если у вас есть какие-либо предпочтения или диетические ограничения. После подтверждения вы сможете пройти опрос о своих вкусовых предпочтениях и напитках.")}</p>
      </section>

      <section className="paper-section gift-section reveal-section">
        <DividerTitle title="Пожелания по подаркам" />
        <div className="section-icon section-icon-frame envelope-small-icon" aria-hidden="true">
          <img className="image-section-icon image-section-icon-envelope" src={weddingIconAssets.envelope} alt="" />
        </div>
        <p>{contentText(content, "gift.text", "Ваше присутствие в день нашей свадьбы - самый значимый подарок для нас.")}</p>
        <small>{contentText(content, "gift.hint", "Конверты приветствуются")}</small>
      </section>

      <section className="paper-section confirm-section reveal-section">
        <DividerTitle title={contentText(content, "confirm.title", "Подтверждение")} />
        <Calendar />
        <button className="primary-button" onClick={openQuestions}>
          {contentText(content, "confirm.button", "Подтвердить присутствие")}
        </button>
      </section>

      {questionsOpen && (
        <section className="paper-section rsvp-section reveal-section" ref={rsvpSectionRef}>
          <DividerTitle title={contentText(content, "questions.title", "Анкета гостя")} />
          <p className="section-lead">{contentText(content, "questions.description", "Пожалуйста, ответьте на вопросы, которые для вас подготовили Жених и Невеста:")}</p>
          <form className="rsvp-form" onSubmit={openPersonalModal}>
            {questions.map((question) => (
              <QuestionField
                key={question.id}
                question={question}
                value={questionAnswers[question.id] ?? []}
                onChange={(value) => setQuestionAnswers((answers) => ({ ...answers, [question.id]: value }))}
              />
            ))}
            <fieldset className="choice-group">
              <legend>Будет ли с вами на празднике ребенок</legend>
              <div className="choice-list horizontal">
                <label className="choice">
                  <input type="radio" checked={hasChild} onChange={() => setHasChild(true)} />
                  <span>да</span>
                </label>
                <label className="choice">
                  <input type="radio" checked={!hasChild} onChange={() => setHasChild(false)} />
                  <span>нет</span>
                </label>
              </div>
            </fieldset>
            <label className="field">
              Комментарий
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} />
            </label>
            {moneyGiftAvailable && (
              <label className="choice money-choice">
                <input
                  type="checkbox"
                  checked={moneyGiftEnabled}
                  onChange={(event) => setMoneyGiftEnabled(event.target.checked)}
                />
                <span>Денежный подарок</span>
              </label>
            )}
            {moneyGiftAvailable && moneyGiftEnabled && (
              <label className="field">
                Сумма
                <input
                  type="number"
                  min="1"
                  value={moneyGiftAmount}
                  onChange={(event) => setMoneyGiftAmount(event.target.value)}
                  required
                />
              </label>
            )}
            <button className="primary-button" type="submit">
              Отправить
            </button>
            {submitMessage && <p className="form-message">{submitMessage}</p>}
          </form>
        </section>
      )}

      <section className="paper-section schedule-section reveal-section">
        <DividerTitle title={contentText(content, "schedule.title", "Свадебное расписание")} />
        <div className="schedule-list">
          {scheduleItems.map((item) => (
            <article className="schedule-item" key={item.time}>
              <div className="line-icon line-icon-frame" aria-hidden="true">
                <img className={`custom-line-icon custom-line-icon-${item.icon}`} src={item.iconUrl ?? getScheduleIconAsset(item.icon)} alt="" />
              </div>
              <strong>{item.time}</strong>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="paper-section location-section reveal-section">
        <DividerTitle title="Место проведения" />
        <p className="location-address">{contentText(content, "intro.place", "Рестобар \"Кубик\", г. Якутск")}</p>
        <iframe
          title="Карта места проведения"
          src={contentText(
            content,
            "location.mapUrl",
            "https://yandex.ru/map-widget/v1/?text=%D0%A0%D0%B5%D1%81%D1%82%D0%BE%D0%B1%D0%B0%D1%80%20%D0%9A%D1%83%D0%B1%D0%B8%D0%BA%20%D0%AF%D0%BA%D1%83%D1%82%D1%81%D0%BA%20%D0%90%D1%80%D0%B6%D0%B0%D0%BA%D0%BE%D0%B2%D0%B0%2010&z=16"
          )}
          loading="lazy"
        />
      </section>

      {modalOpen && createPortal(
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitRsvp}>
            <h2>Подтверждение</h2>
            <div className="bank-details-box">
              <strong>Реквизиты</strong>
              <p>{contentText(content, "gift.bankDetails", "Реквизиты будут добавлены позже.")}</p>
            </div>
            <label className="field">
              Номер телефона
              <input
                value={personal.phone}
                onChange={(event) => setPersonal({ ...personal, phone: event.target.value })}
                required
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setModalOpen(false)}>
                Назад
              </button>
              <button className="primary-button" type="submit">
                Подтвердить
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      <footer className="landing-footer">{contentText(content, "footer.text", "С любовью ждем вас на нашей свадьбе")}</footer>
        </div>
      )}
    </main>
  );
}

function QuestionField({
  question,
  value,
  onChange
}: {
  question: QuestionItem;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  if (question.type === "choice") {
    return (
      <ChoiceGroup
        label={question.label}
        options={question.options}
        value={value}
        multiple={question.multiple}
        onChange={onChange}
      />
    );
  }

  return (
    <label className="field">
      {question.label}
      <input
        type={question.type === "number" ? "number" : question.type}
        value={value[0] ?? ""}
        onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
      />
    </label>
  );
}

function DividerTitle({ title }: { title: string }) {
  return (
    <div className="divider-title">
      <span />
      <h2>{title}</h2>
      <span />
    </div>
  );
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="time-box">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg className="intro-heart-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 27s-10-6.4-10-14a5.5 5.5 0 0 1 10-3.1A5.5 5.5 0 0 1 26 13c0 7.6-10 14-10 14z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="intro-detail-icon" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="6" y="8" width="20" height="18" rx="3" />
      <path d="M11 5v6" />
      <path d="M21 5v6" />
      <path d="M6 14h20" />
      <path d="M11 19h3" />
      <path d="M18 19h3" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="intro-detail-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 28s9-8.2 9-15a9 9 0 0 0-18 0c0 6.8 9 15 9 15z" />
      <circle cx="16" cy="13" r="3.5" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M20 7l-9 9 9 9" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M12 7l9 9-9 9" />
    </svg>
  );
}

function Calendar() {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  return (
    <div className="calendar">
      <h2>Август 2026</h2>
      <div className="weekdays">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="days">
        <span />
        <span />
        <span />
        <span />
        <span />
        {days.map((day) => (
          <span className={day === 21 ? "selected-day" : ""} key={day}>
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}

function getStoryItems(content: ContentMap): Array<{ title: string; text: string; imageKey?: string; imageUrl?: string }> {
  const value = content["story.items"];

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is { title: string; text: string; imageKey?: string; imageUrl?: string } =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "text" in item &&
        typeof item.title === "string" &&
        typeof item.text === "string"
    );
  }

  return [];
}

function getStoryPhoto(
  item: { imageKey?: string; imageUrl?: string },
  index: number,
  media: MediaAsset[],
  gallery: Array<{ src: string; alt: string }>
) {
  const mediaAsset = item.imageKey ? getAsset(media, item.imageKey) : undefined;
  return {
    src: item.imageUrl ?? mediaAsset?.url ?? gallery[index % gallery.length].src,
    alt: mediaAsset?.alt ?? gallery[index % gallery.length].alt
  };
}

function getStringList(content: ContentMap, key: string, fallback: string[]) {
  const value = content[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

function getScheduleItems(content: ContentMap): Array<{ time: string; title: string; text: string; icon: string; iconUrl?: string }> {
  const value = content["schedule.items"];

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is { time: string; title: string; text: string; icon: string; iconUrl?: string } =>
        typeof item === "object" &&
        item !== null &&
        "time" in item &&
        "title" in item &&
        "text" in item &&
        "icon" in item &&
        typeof item.time === "string" &&
        typeof item.title === "string" &&
        typeof item.text === "string" &&
        typeof item.icon === "string"
    );
  }

  return fallbackSchedule.map(([time, title, text, icon]) => ({ time, title, text, icon }));
}

function getScheduleIconAsset(icon: string) {
  if (icon === "camera" || icon === "dinner" || icon === "firework" || icon === "rings") {
    return weddingIconAssets[icon];
  }

  return weddingIconAssets.rings;
}

function getQuestionItems(content: ContentMap, foodOptions: string[], alcoholOptions: string[]): QuestionItem[] {
  const value = content["questions.items"];

  if (Array.isArray(value)) {
    const questions = value
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item, index) => ({
        id: typeof item.id === "string" ? item.id : `question-${index}`,
        label: typeof item.label === "string" ? item.label : `Вопрос ${index + 1}`,
        options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0) : [],
        multiple: typeof item.multiple === "boolean" ? item.multiple : true,
        type: getQuestionType(item.type),
        kind: typeof item.kind === "string" ? item.kind : undefined
      }))
      .filter((item) => item.type !== "choice" || item.options.length > 0);

    if (questions.length > 0) {
      return questions;
    }
  }

  return [
    { id: "food", kind: "food", label: "Есть ли у вас особые предпочтения по еде", options: foodOptions, multiple: true, type: "choice" },
    { id: "alcohol", kind: "alcohol", label: "Какой алкоголь вы предпочитаете", options: alcoholOptions, multiple: true, type: "choice" }
  ];
}

function getQuestionType(value: unknown): QuestionType {
  return value === "text" || value === "number" || value === "date" ? value : "choice";
}

function normalizeQuestionAnswers(
  questions: QuestionItem[],
  answers: Record<string, string[]>
) {
  return questions.reduce<Record<string, string[]>>((accumulator, question) => {
    accumulator[question.id] = answers[question.id] ?? [];
    return accumulator;
  }, {});
}

function getTypedQuestionAnswer(questions: QuestionItem[], answers: Record<string, string[]>, kind: string) {
  const question = questions.find((item) => item.kind === kind);
  return question ? answers[question.id] ?? [] : undefined;
}

function getGreeting(content: ContentMap, invitation: Invitation) {
  const key = `intro.greeting.${invitation.guestType}`;
  const fallback =
    invitation.guestType === "family"
      ? "Дорогая семья"
      : invitation.guestType === "couple"
        ? "Дорогие"
        : "Дорогой/дорогая";

  return contentText(content, key, fallback);
}

function getTypeText(content: ContentMap, invitation: Invitation) {
  const key = `intro.typeText.${invitation.guestType}`;
  const fallback =
    invitation.guestType === "family"
      ? "Будем счастливы видеть вашу семью рядом с нами в этот важный день."
      : invitation.guestType === "couple"
        ? "Будем счастливы видеть вас вместе рядом с нами в этот важный день."
        : "Будем счастливы видеть вас рядом с нами в этот важный день.";

  return contentText(content, key, fallback);
}

function getAsset(media: MediaAsset[], key: string) {
  return media.find((asset) => asset.key === key);
}

function getAssetUrl(media: MediaAsset[], key: string) {
  return getAsset(media, key)?.url;
}

function contentText(content: ContentMap, key: string, fallback: string) {
  const value = content[key];
  return typeof value === "string" ? value : fallback;
}

function contentBoolean(content: ContentMap, key: string, fallback: boolean) {
  const value = content[key];
  return typeof value === "boolean" ? value : fallback;
}

function splitEnvelopeTitle(title: string): [string, string] {
  const lines = title
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return [lines[0], lines.slice(1).join(" ")];
  }

  const words = title.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return [words[0] ?? "Приглашение", ""];
  }

  const splitAt = Math.ceil(words.length / 2);
  return [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")];
}
