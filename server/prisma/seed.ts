import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const content = [
  ["couple.names", "Никита и Анна", "text"],
  ["hero.title", "Приглашение на свадьбу", "text"],
  ["intro.greeting.single", "Дорогой/дорогая", "text"],
  ["intro.greeting.couple", "Дорогие", "text"],
  ["intro.greeting.family", "Дорогая семья", "text"],
  ["intro.typeText.single", "Будем счастливы видеть вас рядом с нами в этот важный день.", "text"],
  ["intro.typeText.couple", "Будем счастливы видеть вас вместе рядом с нами в этот важный день.", "text"],
  ["intro.typeText.family", "Будем счастливы видеть вашу семью рядом с нами в этот важный день.", "text"],
  ["intro.date", "пятница, 21 августа 2026", "text"],
  ["intro.place", "Рестобар \"Кубик\", г. Якутск, ул. Аржакова, 10", "text"],
  ["intro.message", "приглашаем вас разделить с нами радость главного события в нашей жизни.", "text"],
  ["about.text", "Дорогой гость! Мы рады сообщить Вам, что состоится самое главное торжество в нашей жизни - день нашей свадьбы! Приглашаем Вас разделить с нами радость этого незабываемого дня.", "text"],
  ["family.line", "С любовью, жених и невеста", "text"],
  ["story.items", [
    {
      title: "Первая встреча",
      text: "С этого дня началась наша общая история, полная теплых разговоров, маленьких традиций и больших планов.",
      imageKey: "gallery-1"
    },
    {
      title: "Наше решение",
      text: "Мы поняли, что хотим идти дальше вместе, поддерживать друг друга и создавать дом, в который всегда хочется возвращаться.",
      imageKey: "gallery-2"
    }
  ], "json"],
  ["story.title", "Наша история", "text"],
  ["menu.title", "Меню", "text"],
  ["menu.text", "Меню разнообразно, поэтому сообщите нам заранее, если у вас есть какие-либо предпочтения или диетические ограничения. После подтверждения вы сможете пройти опрос о своих вкусовых предпочтениях и напитках.", "text"],
  ["confirm.title", "Подтверждение", "text"],
  ["confirm.button", "Подтвердить присутствие", "text"],
  ["questions.title", "Анкета гостя", "text"],
  ["questions.description", "Пожалуйста, ответьте на вопросы, которые для вас подготовили Жених и Невеста:", "text"],
  ["questions.items", [
    {
      id: "food",
      kind: "food",
      type: "choice",
      label: "Есть ли у вас особые предпочтения по еде",
      options: ["нет", "не ем мясо", "не ем рыбу", "вегетарианец"],
      multiple: true
    },
    {
      id: "alcohol",
      kind: "alcohol",
      type: "choice",
      label: "Какой алкоголь вы предпочитаете",
      options: ["Красное вино", "Белое вино", "Шампанское", "Виски/коньяк", "Водка", "Не буду пить алкоголь"],
      multiple: true
    }
  ], "json"],
  ["questions.foodOptions", ["нет", "не ем мясо", "не ем рыбу", "вегетарианец"], "json"],
  ["questions.alcoholOptions", ["Красное вино", "Белое вино", "Шампанское", "Виски/коньяк", "Водка", "Не буду пить алкоголь"], "json"],
  ["schedule.title", "Свадебное расписание", "text"],
  ["schedule.items", [
    {
      time: "13:30",
      title: "Торжественная регистрация",
      text: "Приглашаем всех разделить с нами такой торжественный момент.",
      icon: "rings"
    },
    {
      time: "15:00",
      title: "Фотосессия",
      text: "До банкета у вас будет время, чтобы узнать друг друга поближе и пофотографироваться.",
      icon: "camera"
    },
    {
      time: "16:00",
      title: "Праздничный банкет",
      text: "Время пролетит незаметно за фуршетом и общением с другими гостями.",
      icon: "dinner"
    },
    {
      time: "23:00",
      title: "Окончание праздничного дня",
      text: "Даже такой день может когда-то подойти к концу.",
      icon: "firework"
    }
  ], "json"],
  ["location.mapUrl", "https://yandex.ru/map-widget/v1/?text=%D0%A0%D0%B5%D1%81%D1%82%D0%BE%D0%B1%D0%B0%D1%80%20%D0%9A%D1%83%D0%B1%D0%B8%D0%BA%20%D0%AF%D0%BA%D1%83%D1%82%D1%81%D0%BA%20%D0%90%D1%80%D0%B6%D0%B0%D0%BA%D0%BE%D0%B2%D0%B0%2010&z=16", "text"],
  ["gift.text", "Ваше присутствие в день нашей свадьбы - самый значимый подарок для нас.", "text"],
  ["gift.hint", "Конверты приветствуются", "text"],
  ["gift.bankDetails", "Реквизиты будут добавлены позже.", "text"],
  ["gift.moneyGiftEnabled", true, "json"],
  ["footer.text", "С любовью ждем вас на нашей свадьбе", "text"],
  ["admin.note", "Тексты можно менять из админ-панели. Фотографии загружаются локально на сервер.", "text"]
] as const;

async function main() {
  for (const [key, value, type] of content) {
    const existing = await prisma.siteContent.findUnique({
      where: { key }
    });

    if (!existing) {
      await prisma.siteContent.create({
        data: { key, value, type }
      });
    }
  }

  const demoInvitation = await prisma.invitation.findUnique({
    where: { slug: "demo-family" }
  });

  if (!demoInvitation) {
    await prisma.invitation.create({
      data: {
        slug: "demo-family",
        displayName: "Светлана и Андрей",
        guestType: "couple"
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
