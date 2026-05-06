"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TastingNoteInput = {
  appearance?: { color?: string | undefined; clarity?: string | undefined; foam?: string | undefined };
  aromaGrain?: number;
  aromaFruit?: number;
  aromaNuruk?: number;
  aromaHop?: number;
  aromaAlcohol?: number;
  aromaOther?: string;
  tasteSweet?: number;
  tasteSour?: number;
  tasteBitter?: number;
  tasteUmami?: number;
  body?: number;
  carbonation?: number;
  overallScore?: number;
  notes?: string;
};

export async function createTastingNote(batchId: string, data: TastingNoteInput) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: batchId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!batch) throw new Error("배치를 찾을 수 없습니다.");

  await db.tastingNote.create({
    data: {
      batchId,
      tasterId: session.user.id,
      ...(data.appearance ? { appearance: data.appearance as any } : {}),
      aromaGrain: data.aromaGrain ?? 0,
      aromaFruit: data.aromaFruit ?? 0,
      aromaNuruk: data.aromaNuruk ?? 0,
      aromaHop: data.aromaHop ?? 0,
      aromaAlcohol: data.aromaAlcohol ?? 0,
      aromaOther: data.aromaOther ?? null,
      tasteSweet: data.tasteSweet ?? 0,
      tasteSour: data.tasteSour ?? 0,
      tasteBitter: data.tasteBitter ?? 0,
      tasteUmami: data.tasteUmami ?? 0,
      body: data.body ?? 0,
      carbonation: data.carbonation ?? 0,
      overallScore: data.overallScore ?? 0,
      notes: data.notes ?? null,
    },
  });

  revalidatePath(`/dashboard/batches/${batchId}`);
  redirect(`/dashboard/batches/${batchId}`);
}

export async function updateTastingNote(noteId: string, data: TastingNoteInput) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const note = await db.tastingNote.findFirst({
    where: { id: noteId },
    include: { batch: { select: { tenantId: true, id: true } } },
  });
  if (!note || note.batch.tenantId !== session.user.tenantId)
    throw new Error("시음 기록을 찾을 수 없습니다.");

  await db.tastingNote.update({
    where: { id: noteId },
    data: {
      ...(data.appearance ? { appearance: data.appearance as any } : {}),
      aromaGrain: data.aromaGrain ?? note.aromaGrain,
      aromaFruit: data.aromaFruit ?? note.aromaFruit,
      aromaNuruk: data.aromaNuruk ?? note.aromaNuruk,
      aromaHop: data.aromaHop ?? note.aromaHop,
      aromaAlcohol: data.aromaAlcohol ?? note.aromaAlcohol,
      aromaOther: data.aromaOther ?? note.aromaOther,
      tasteSweet: data.tasteSweet ?? note.tasteSweet,
      tasteSour: data.tasteSour ?? note.tasteSour,
      tasteBitter: data.tasteBitter ?? note.tasteBitter,
      tasteUmami: data.tasteUmami ?? note.tasteUmami,
      body: data.body ?? note.body,
      carbonation: data.carbonation ?? note.carbonation,
      overallScore: data.overallScore ?? note.overallScore,
      notes: data.notes ?? note.notes,
    },
  });

  revalidatePath(`/dashboard/batches/${note.batch.id}`);
  redirect(`/dashboard/batches/${note.batch.id}`);
}

export async function deleteTastingNote(noteId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const note = await db.tastingNote.findFirst({
    where: { id: noteId },
    include: { batch: { select: { tenantId: true, id: true } } },
  });
  if (!note || note.batch.tenantId !== session.user.tenantId)
    throw new Error("시음 기록을 찾을 수 없습니다.");

  await db.tastingNote.delete({ where: { id: noteId } });
  revalidatePath(`/dashboard/batches/${note.batch.id}`);
}
