"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  CONTRACT_EDITOR_SURFACE_CLASS,
  contractEditorExtensions,
} from "@/lib/contract-editor-extensions";
import ContractDocumentCanvas from "./contract-document-canvas";

interface ContractSavedPreviewProps {
  html: string;
  locale?: string;
}

/**
 * Read-only preview using the same TipTap renderer + page shell as the editor (true WYSIWYG).
 */
export default function ContractSavedPreview({
  html,
  locale = "zh",
}: ContractSavedPreviewProps) {
  const t = useTranslations("revise");

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: contractEditorExtensions(),
    content: html || "<p></p>",
    editorProps: {
      attributes: {
        class: CONTRACT_EDITOR_SURFACE_CLASS,
        spellcheck: "false",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (html && html !== current) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, html]);

  return (
    <div className="contract-preview-root flex-1 min-h-0 flex flex-col">
      <ContractDocumentCanvas locale={locale}>
        <EditorContent
          editor={editor}
          className="contract-rich-text-editor contract-rich-text-editor--readonly"
          aria-label={t("editorPreviewLabel")}
        />
      </ContractDocumentCanvas>
    </div>
  );
}
