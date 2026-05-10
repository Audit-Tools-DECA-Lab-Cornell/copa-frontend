import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import type { LegalDocument } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EditableField } from "../shared-components";
import { makeDefaultLegalDocument, makeDefaultLegalSection } from "../defaults";

export function LegalDocumentsEditor({
	documents,
	onChange
}: Readonly<{
	documents: LegalDocument[];
	onChange: (documents: LegalDocument[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateDocument(index: number, updater: (d: LegalDocument) => void) {
		const next = structuredClone(documents);
		updater(next[index]);
		onChange(next);
	}

	function addDocument() {
		onChange([...documents, makeDefaultLegalDocument()]);
	}

	function removeDocument(index: number) {
		onChange(documents.filter((_, i) => i !== index));
	}

	function updateSection(docIndex: number, sectionIndex: number, updater: (s: LegalDocument["sections"][0]) => void) {
		const next = structuredClone(documents);
		updater(next[docIndex].sections[sectionIndex]);
		onChange(next);
	}

	function addSection(docIndex: number) {
		const next = structuredClone(documents);
		next[docIndex].sections.push(makeDefaultLegalSection());
		onChange(next);
	}

	function removeSection(docIndex: number, sectionIndex: number) {
		const next = structuredClone(documents);
		next[docIndex].sections.splice(sectionIndex, 1);
		onChange(next);
	}

	function updateBodyParagraph(docIndex: number, sectionIndex: number, paraIndex: number, value: string) {
		updateSection(docIndex, sectionIndex, s => {
			s.body[paraIndex] = value;
		});
	}

	function addBodyParagraph(docIndex: number, sectionIndex: number) {
		updateSection(docIndex, sectionIndex, s => {
			s.body.push("");
		});
	}

	function removeBodyParagraph(docIndex: number, sectionIndex: number, paraIndex: number) {
		updateSection(docIndex, sectionIndex, s => {
			s.body.splice(paraIndex, 1);
		});
	}

	function updateBullet(docIndex: number, sectionIndex: number, bulletIndex: number, value: string) {
		updateSection(docIndex, sectionIndex, s => {
			s.bullets[bulletIndex] = value;
		});
	}

	function addBullet(docIndex: number, sectionIndex: number) {
		updateSection(docIndex, sectionIndex, s => {
			s.bullets.push("");
		});
	}

	function removeBullet(docIndex: number, sectionIndex: number, bulletIndex: number) {
		updateSection(docIndex, sectionIndex, s => {
			s.bullets.splice(bulletIndex, 1);
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">{t("legalDocuments")}</h3>
				<Button onClick={addDocument}>
					<Plus className="mr-1.5 h-4 w-4" />
					{t("addLegalDoc")}
				</Button>
			</div>

			<Accordion type="single" collapsible className="w-full">
				{documents.map((doc, docIndex) => (
					<AccordionItem key={docIndex} value={`doc-${docIndex}`}>
						<AccordionTrigger className="text-sm hover:no-underline border border-border/60 bg-card rounded-t-lg px-4 data-[state=closed]:rounded-b-lg">
							<span className="flex items-center gap-2">
								<span className="font-medium text-left">{doc.title || "Untitled Document"}</span>
								<span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
									{doc.key}
								</span>
							</span>
						</AccordionTrigger>
						<AccordionContent className="border-x border-b border-border/60 rounded-b-lg bg-card/30 p-4">
							<div className="space-y-6">
								<div className="flex justify-end">
									<Button variant="destructive" size="sm" onClick={() => removeDocument(docIndex)}>
										<Trash2 className="mr-1.5 h-3.5 w-3.5" />
										{t("removeLegalDoc")}
									</Button>
								</div>

								{/* Document Metadata */}
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-sm">{t("documentDetails")}</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-3 sm:grid-cols-2">
										<EditableField
											label={t("legalDocKey")}
											value={doc.key}
											mono
											onChange={v =>
												updateDocument(docIndex, d => {
													d.key = v;
												})
											}
										/>
										<EditableField
											label={t("legalDocShortTitle")}
											value={doc.short_title}
											onChange={v =>
												updateDocument(docIndex, d => {
													d.short_title = v;
												})
											}
										/>
										<EditableField
											label={t("legalDocTitle")}
											value={doc.title}
											onChange={v =>
												updateDocument(docIndex, d => {
													d.title = v;
												})
											}
										/>
										<EditableField
											label={t("legalDocEyebrow")}
											value={doc.eyebrow}
											onChange={v =>
												updateDocument(docIndex, d => {
													d.eyebrow = v;
												})
											}
										/>
										<EditableField
											label={t("legalDocLastUpdated")}
											value={doc.last_updated}
											onChange={v =>
												updateDocument(docIndex, d => {
													d.last_updated = v;
												})
											}
										/>
										<div className="col-span-full sm:col-span-2">
											<EditableField
												label={t("legalDocSummary")}
												value={doc.summary}
												multiline
												onChange={v =>
													updateDocument(docIndex, d => {
														d.summary = v;
													})
												}
											/>
										</div>
									</CardContent>
								</Card>

								{/* Sections */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											{t("legalSections")} ({doc.sections.length})
										</p>
										<Button variant="outline" size="sm" onClick={() => addSection(docIndex)}>
											<Plus className="mr-1.5 h-3 w-3" />
											{t("addLegalSection")}
										</Button>
									</div>

									{doc.sections.map((section, sectionIndex) => (
										<Card key={sectionIndex} className="border-border/60">
											<CardHeader className="pb-2 pt-3 px-4">
												<div className="flex items-start justify-between gap-2">
													<div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
														<EditableField
															label={t("legalSectionKey")}
															value={section.key}
															mono
															onChange={v =>
																updateSection(docIndex, sectionIndex, s => {
																	s.key = v;
																})
															}
														/>
														<EditableField
															label={t("legalSectionTitle")}
															value={section.title}
															onChange={v =>
																updateSection(docIndex, sectionIndex, s => {
																	s.title = v;
																})
															}
														/>
													</div>
													<Button
														variant="ghost"
														size="icon"
														className="shrink-0 text-destructive hover:text-destructive h-8 w-8 mt-4"
														onClick={() => removeSection(docIndex, sectionIndex)}>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
											</CardHeader>

											<CardContent className="px-4 pb-4 space-y-3">
												{/* Body paragraphs */}
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<p className="text-xs text-muted-foreground">
															{t("legalSectionBody")}
														</p>
														<Button
															variant="ghost"
															size="sm"
															className="h-6 text-xs"
															onClick={() => addBodyParagraph(docIndex, sectionIndex)}>
															<Plus className="mr-1 h-3 w-3" />
															{t("addParagraph")}
														</Button>
													</div>
													{section.body.map((para, paraIndex) => (
														<div key={paraIndex} className="flex gap-2">
															<Textarea
																className="min-h-[64px] text-sm flex-1"
																value={para}
																onChange={e =>
																	updateBodyParagraph(
																		docIndex,
																		sectionIndex,
																		paraIndex,
																		e.target.value
																	)
																}
															/>
															<Button
																variant="ghost"
																size="icon"
																className="shrink-0 text-destructive hover:text-destructive h-8 w-8 mt-1"
																onClick={() =>
																	removeBodyParagraph(
																		docIndex,
																		sectionIndex,
																		paraIndex
																	)
																}>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</div>
													))}
												</div>

												{/* Bullet points */}
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<p className="text-xs text-muted-foreground">
															{t("legalSectionBullets")}
														</p>
														<Button
															variant="ghost"
															size="sm"
															className="h-6 text-xs"
															onClick={() => addBullet(docIndex, sectionIndex)}>
															<Plus className="mr-1 h-3 w-3" />
															{t("addBullet")}
														</Button>
													</div>
													{section.bullets.map((bullet, bulletIndex) => (
														<div key={bulletIndex} className="flex gap-2">
															<Textarea
																className="min-h-[48px] text-sm flex-1"
																value={bullet}
																onChange={e =>
																	updateBullet(
																		docIndex,
																		sectionIndex,
																		bulletIndex,
																		e.target.value
																	)
																}
															/>
															<Button
																variant="ghost"
																size="icon"
																className="shrink-0 text-destructive hover:text-destructive h-8 w-8 mt-1"
																onClick={() =>
																	removeBullet(docIndex, sectionIndex, bulletIndex)
																}>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</div>
													))}
													{section.bullets.length === 0 && (
														<p className="text-xs text-muted-foreground/60 italic">
															{t("noBullets")}
														</p>
													)}
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
}
