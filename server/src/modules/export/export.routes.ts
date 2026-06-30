import { Router } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../../prisma/client.js";

export const exportRouter = Router();

exportRouter.get("/guests/export.xlsx", async (_req, res) => {
  const [guests, questionsContent] = await Promise.all([
    prisma.guest.findMany({
      include: { invitation: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.siteContent.findUnique({
      where: { key: "questions.items" }
    })
  ]);
  const questions = getQuestions(questionsContent?.value);
  const extraQuestions = questions.filter((question) => question.kind !== "food" && question.kind !== "alcohol");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Гости");

  sheet.columns = [
    { header: "Приглашение", key: "invitation", width: 28 },
    { header: "Подсказка о госте", key: "internalName", width: 30 },
    { header: "Телефон", key: "phone", width: 18 },
    { header: "Еда", key: "food", width: 32 },
    { header: "Алкоголь", key: "alcohol", width: 36 },
    { header: "Ребенок", key: "child", width: 12 },
    { header: "Денежный подарок", key: "moneyGift", width: 18 },
    { header: "Сумма", key: "moneyGiftAmount", width: 14 },
    { header: "Комментарий", key: "comment", width: 40 },
    ...extraQuestions.map((question) => ({
      header: question.label,
      key: `question_${question.id}`,
      width: Math.max(22, Math.min(question.label.length + 8, 42))
    })),
    { header: "Обновлено", key: "updatedAt", width: 24 }
  ];

  guests.forEach((guest) => {
    const questionAnswers = normalizeQuestionAnswers(guest.questionAnswers);
    sheet.addRow({
      invitation: guest.invitation.displayName,
      internalName: guest.invitation.internalName || guest.invitation.displayName,
      phone: guest.phone,
      food: guest.foodPreferences.join(", "),
      alcohol: guest.alcoholPreferences.join(", "),
      child: guest.hasChild ? "Да" : "Нет",
      moneyGift: guest.moneyGiftEnabled ? "Да" : "Нет",
      moneyGiftAmount: guest.moneyGiftAmount ?? "",
      comment: guest.comment ?? "",
      ...Object.fromEntries(extraQuestions.map((question) => [`question_${question.id}`, (questionAnswers[question.id] ?? []).join(", ")])),
      updatedAt: guest.updatedAt.toLocaleString("ru-RU")
    });
  });

  sheet.getRow(1).font = { bold: true };

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=guests.xlsx");

  await workbook.xlsx.write(res);
  res.end();
});

type Question = {
  id: string;
  label: string;
  kind?: string;
};

function getQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `question-${index}`,
      label: typeof item.label === "string" ? item.label : `Вопрос ${index + 1}`,
      kind: typeof item.kind === "string" ? item.kind : undefined
    }));
}

function normalizeQuestionAnswers(value: unknown): Record<string, string[]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, answers]) => [
      key,
      Array.isArray(answers) ? answers.filter((answer): answer is string => typeof answer === "string") : []
    ])
  );
}
