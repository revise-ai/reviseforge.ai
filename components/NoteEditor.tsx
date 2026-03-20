"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface NoteEditorProps {
  noteId?: string;
  initialName?: string;
}

type PolishMode = "choose" | "polish-only" | "polish-resource" | "result";

export default function NoteEditor({
  noteId,
  initialName = "Untitled Note",
}: NoteEditorProps) {
  const [noteName, setNoteName] = useState(initialName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savedStatus, setSavedStatus] = useState<
    "saved" | "saving" | "unsaved"
  >("saved");
  const [secondsSaved, setSecondsSaved] = useState(0);

  const [showAIModal, setShowAIModal] = useState(false);
  const [polishStep, setPolishStep] = useState<PolishMode>("choose");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");

  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceType, setResourceType] = useState<"file" | "youtube" | null>(
    null,
  );
  const [youtubeLink, setYoutubeLink] = useState("");
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState(
    "'Times New Roman', Times, serif",
  );

  const [imagePopup, setImagePopup] = useState<{
    el: HTMLElement;
    x: number;
    y: number;
    float: "none" | "left" | "right";
    width: number;
  } | null>(null);

  const selectedImageRef = useRef<HTMLElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Table resize state ──
  const tableResizeRef = useRef<{
    type: "col" | "row";
    startX: number;
    startY: number;
    startSize: number;
    nextSize: number;
    el: HTMLElement;
    nextEl: HTMLElement | null;
  } | null>(null);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current?.contains(sel.anchorNode)
    ) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (!savedSelectionRef.current || !editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current.cloneRange());
    }
  }, []);

  const ensureCursor = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (
      !sel ||
      sel.rangeCount === 0 ||
      !editorRef.current.contains(sel.anchorNode)
    ) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      savedSelectionRef.current = range.cloneRange();
    }
  }, []);

  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (
        sel &&
        sel.rangeCount > 0 &&
        editorRef.current?.contains(sel.anchorNode)
      ) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".img-popup") && !t.closest("[data-img-wrapper]")) {
        setImagePopup(null);
        if (selectedImageRef.current) {
          const img = selectedImageRef.current.querySelector(
            "img",
          ) as HTMLImageElement;
          if (img) {
            img.style.outline = "none";
            img.style.border = "2px solid transparent";
          }
          selectedImageRef.current = null;
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard delete for selected image ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedImageRef.current
      ) {
        e.preventDefault();
        selectedImageRef.current.remove();
        selectedImageRef.current = null;
        setImagePopup(null);
        triggerSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Global table resize mouse events ──
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const r = tableResizeRef.current;
      if (!r) return;
      if (r.type === "col") {
        const diff = e.clientX - r.startX;
        const newSize = Math.max(30, r.startSize + diff);
        r.el.style.width = newSize + "px";
        if (r.nextEl)
          r.nextEl.style.width = Math.max(30, r.nextSize - diff) + "px";
      } else {
        const diff = e.clientY - r.startY;
        const newSize = Math.max(20, r.startSize + diff);
        r.el.style.height = newSize + "px";
      }
    };
    const onMouseUp = () => {
      if (tableResizeRef.current) {
        tableResizeRef.current = null;
        triggerSave();
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!noteId) return;
    const loadNote = async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("name, content")
        .eq("id", noteId)
        .single();
      if (!error && data) {
        setNoteName(data.name);
        if (editorRef.current && data.content)
          editorRef.current.innerHTML = data.content;
        setTimeout(() => {
          reattachImageListeners();
          reattachTableListeners();
        }, 200);
      }
    };
    loadNote();
  }, [noteId]);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  const triggerSave = useCallback(() => {
    setSavedStatus("saving");
    setSecondsSaved(0);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (noteId) {
        const content = editorRef.current?.innerHTML ?? "";
        await supabase
          .from("notes")
          .update({
            name: noteName,
            content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId);
      }
      setSavedStatus("saved");
      setSecondsSaved(0);
    }, 1200);
  }, [noteId, noteName]);

  useEffect(() => {
    savedTickRef.current = setInterval(() => {
      if (savedStatus === "saved") setSecondsSaved((s) => s + 1);
    }, 1000);
    return () => {
      if (savedTickRef.current) clearInterval(savedTickRef.current);
    };
  }, [savedStatus]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const reattachImageListeners = useCallback(() => {
    editorRef.current?.querySelectorAll("[data-img-wrapper]").forEach((w) => {
      const wrapper = w as HTMLElement;
      const img = wrapper.querySelector("img") as HTMLImageElement;
      if (!img) return;
      wrapper.onclick = (e) => {
        e.stopPropagation();
        if (selectedImageRef.current && selectedImageRef.current !== wrapper) {
          const pi = selectedImageRef.current.querySelector(
            "img",
          ) as HTMLImageElement;
          if (pi) {
            pi.style.outline = "none";
            pi.style.border = "2px solid transparent";
          }
        }
        selectedImageRef.current = wrapper;
        img.style.outline = "2px solid #2563eb";
        img.style.border = "2px solid #2563eb";
        const rect = wrapper.getBoundingClientRect();
        setImagePopup({
          el: wrapper,
          x: rect.left,
          y: rect.bottom + 8,
          float: (wrapper.style.float as any) || "none",
          width: img.offsetWidth,
        });
      };
    });
  }, []);

  // ── Attach table resize + add row/col listeners ──
  const reattachTableListeners = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current
      .querySelectorAll("table[data-sf-table]")
      .forEach((tbl) => {
        attachTableControls(tbl as HTMLTableElement);
      });
  }, []);

  // ── Build table controls (resizers + add buttons) ──
  const attachTableControls = useCallback(
    (table: HTMLTableElement) => {
      // Remove old resizers/adders first
      table
        .querySelectorAll("[data-sf-resizer],[data-sf-adder]")
        .forEach((el) => el.remove());

      const rows = Array.from(
        table.querySelectorAll("tr"),
      ) as HTMLTableRowElement[];
      const firstRow = rows[0];
      if (!firstRow) return;
      const cells = Array.from(firstRow.cells) as HTMLTableCellElement[];

      // ── Column resizers (on each cell's right border) ──
      rows.forEach((tr) => {
        Array.from(tr.cells).forEach((td, ci) => {
          if (ci === tr.cells.length - 1) return; // skip last cell
          // Remove existing resizer on this cell
          td.querySelectorAll("[data-sf-resizer]").forEach((el) => el.remove());

          const resizer = document.createElement("div");
          resizer.setAttribute("data-sf-resizer", "col");
          resizer.style.cssText = `
          position:absolute;top:0;right:-3px;width:7px;height:100%;
          cursor:col-resize;z-index:10;background:transparent;
          transition:background 0.15s;
        `;
          resizer.onmouseenter = () => {
            resizer.style.background = "rgba(37,99,235,0.35)";
          };
          resizer.onmouseleave = () => {
            if (!tableResizeRef.current)
              resizer.style.background = "transparent";
          };
          resizer.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nextTd = td.nextElementSibling as HTMLElement | null;
            tableResizeRef.current = {
              type: "col",
              startX: e.clientX,
              startY: e.clientY,
              startSize: td.offsetWidth,
              nextSize: nextTd?.offsetWidth ?? 0,
              el: td as HTMLElement,
              nextEl: nextTd,
            };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          };
          (td as HTMLElement).style.position = "relative";
          td.appendChild(resizer);
        });
      });

      // ── Row resizers (on each row's bottom border) ──
      rows.forEach((tr, ri) => {
        if (ri === rows.length - 1) return; // skip last row
        const firstTd = tr.cells[0] as HTMLElement;
        if (!firstTd) return;

        const resizer = document.createElement("div");
        resizer.setAttribute("data-sf-resizer", "row");
        resizer.style.cssText = `
        position:absolute;bottom:-3px;left:0;width:100%;height:7px;
        cursor:row-resize;z-index:10;background:transparent;
        transition:background 0.15s;
      `;
        resizer.onmouseenter = () => {
          resizer.style.background = "rgba(37,99,235,0.35)";
        };
        resizer.onmouseleave = () => {
          if (!tableResizeRef.current) resizer.style.background = "transparent";
        };
        resizer.onmousedown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          tableResizeRef.current = {
            type: "row",
            startX: e.clientX,
            startY: e.clientY,
            startSize: tr.offsetHeight,
            nextSize: 0,
            el: tr as HTMLElement,
            nextEl: null,
          };
          document.body.style.cursor = "row-resize";
          document.body.style.userSelect = "none";
        };
        firstTd.style.position = "relative";
        firstTd.appendChild(resizer);
      });

      // ── Add column button (right of table) ──
      const addColBtn = document.createElement("button");
      addColBtn.setAttribute("data-sf-adder", "col");
      addColBtn.contentEditable = "false";
      addColBtn.title = "Add column";
      addColBtn.style.cssText = `
      position:absolute;top:50%;right:-28px;transform:translateY(-50%);
      width:22px;height:22px;border-radius:50%;background:#2563eb;color:white;
      border:none;cursor:pointer;font-size:16px;line-height:1;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);opacity:0;transition:opacity 0.15s;z-index:20;
    `;
      addColBtn.innerHTML = "+";
      addColBtn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Add a column to every row
        table.querySelectorAll("tr").forEach((tr) => {
          const newTd = document.createElement(
            tr.closest("thead") ? "th" : "td",
          );
          (newTd as HTMLElement).style.cssText =
            "border:1px solid #c0c0c0;padding:8px 10px;min-width:60px;vertical-align:top;position:relative;";
          newTd.innerHTML = "<br>";
          tr.appendChild(newTd);
        });
        attachTableControls(table);
        triggerSave();
      };

      // ── Add row button (below table) ──
      const addRowBtn = document.createElement("button");
      addRowBtn.setAttribute("data-sf-adder", "row");
      addRowBtn.contentEditable = "false";
      addRowBtn.title = "Add row";
      addRowBtn.style.cssText = `
      position:absolute;left:50%;bottom:-28px;transform:translateX(-50%);
      width:22px;height:22px;border-radius:50%;background:#2563eb;color:white;
      border:none;cursor:pointer;font-size:16px;line-height:1;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);opacity:0;transition:opacity 0.15s;z-index:20;
    `;
      addRowBtn.innerHTML = "+";
      addRowBtn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tbody = table.querySelector("tbody") || table;
        const lastRow = table.querySelector("tr:last-child");
        const colCount = lastRow ? lastRow.children.length : cells.length;
        const newTr = document.createElement("tr");
        for (let i = 0; i < colCount; i++) {
          const newTd = document.createElement("td");
          newTd.style.cssText =
            "border:1px solid #c0c0c0;padding:8px 10px;min-width:60px;vertical-align:top;position:relative;";
          newTd.innerHTML = "<br>";
          newTr.appendChild(newTd);
        }
        tbody.appendChild(newTr);
        attachTableControls(table);
        triggerSave();
      };

      // Show/hide add buttons on table hover
      const wrapper =
        (table.closest("[data-sf-table-wrapper]") as HTMLElement) ||
        (table.parentElement as HTMLElement);
      if (wrapper) {
        wrapper.style.position = "relative";
        // Remove old adders from wrapper
        wrapper
          .querySelectorAll("[data-sf-adder]")
          .forEach((el) => el.remove());
        wrapper.appendChild(addColBtn);
        wrapper.appendChild(addRowBtn);

        wrapper.onmouseenter = () => {
          addColBtn.style.opacity = "1";
          addRowBtn.style.opacity = "1";
        };
        wrapper.onmouseleave = () => {
          addColBtn.style.opacity = "0";
          addRowBtn.style.opacity = "0";
        };
      }
    },
    [triggerSave],
  );

  const execCmd = useCallback(
    (command: string, value?: string) => {
      restoreSelection();
      document.execCommand(command, false, value ?? undefined);
      editorRef.current?.focus();
      triggerSave();
    },
    [restoreSelection, triggerSave],
  );

  const handleBulletList = useCallback(() => {
    ensureCursor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let inUL: HTMLElement | null = null;
    let cur: Node | null = node;
    while (cur && cur !== editorRef.current) {
      if ((cur as HTMLElement).tagName?.toLowerCase() === "ul") {
        inUL = cur as HTMLElement;
        break;
      }
      cur = (cur as HTMLElement).parentElement;
    }
    if (inUL) {
      const frag = document.createDocumentFragment();
      inUL.querySelectorAll("li").forEach((li) => {
        const p = document.createElement("p");
        p.innerHTML = li.innerHTML || "<br>";
        frag.appendChild(p);
      });
      inUL.replaceWith(frag);
    } else {
      const ul = document.createElement("ul");
      ul.style.cssText = "list-style-type:disc;padding-left:32px;margin:6px 0;";
      const li = document.createElement("li");
      li.innerHTML = "<br>";
      ul.appendChild(li);
      range.deleteContents();
      range.insertNode(ul);
      const nr = document.createRange();
      nr.setStart(li, 0);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
      savedSelectionRef.current = nr.cloneRange();
    }
    editorRef.current?.focus();
    triggerSave();
  }, [ensureCursor, triggerSave]);

  const handleOrderedList = useCallback(() => {
    ensureCursor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let inOL: HTMLElement | null = null;
    let cur: Node | null = node;
    while (cur && cur !== editorRef.current) {
      if ((cur as HTMLElement).tagName?.toLowerCase() === "ol") {
        inOL = cur as HTMLElement;
        break;
      }
      cur = (cur as HTMLElement).parentElement;
    }
    if (inOL) {
      const frag = document.createDocumentFragment();
      inOL.querySelectorAll("li").forEach((li) => {
        const p = document.createElement("p");
        p.innerHTML = li.innerHTML || "<br>";
        frag.appendChild(p);
      });
      inOL.replaceWith(frag);
    } else {
      const ol = document.createElement("ol");
      ol.style.cssText =
        "list-style-type:decimal;padding-left:32px;margin:6px 0;";
      const li = document.createElement("li");
      li.innerHTML = "<br>";
      ol.appendChild(li);
      range.deleteContents();
      range.insertNode(ol);
      const nr = document.createRange();
      nr.setStart(li, 0);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
      savedSelectionRef.current = nr.cloneRange();
    }
    editorRef.current?.focus();
    triggerSave();
  }, [ensureCursor, triggerSave]);

  const handleIndent = useCallback(() => {
    ensureCursor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let cur: Node | null = node;
    while (cur && cur !== editorRef.current) {
      const el = cur as HTMLElement;
      const tag = el.tagName?.toLowerCase();
      if (tag === "li") {
        document.execCommand("indent", false, undefined);
        triggerSave();
        return;
      }
      if (["p", "div", "h1", "h2", "h3", "h4", "blockquote"].includes(tag)) {
        el.style.marginLeft = parseInt(el.style.marginLeft || "0") + 40 + "px";
        triggerSave();
        return;
      }
      cur = (cur as HTMLElement).parentElement;
    }
    document.execCommand("indent", false, undefined);
    triggerSave();
  }, [ensureCursor, triggerSave]);

  const handleOutdent = useCallback(() => {
    ensureCursor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let cur: Node | null = node;
    while (cur && cur !== editorRef.current) {
      const el = cur as HTMLElement;
      const tag = el.tagName?.toLowerCase();
      if (tag === "li") {
        document.execCommand("outdent", false, undefined);
        triggerSave();
        return;
      }
      if (["p", "div", "h1", "h2", "h3", "h4", "blockquote"].includes(tag)) {
        el.style.marginLeft =
          Math.max(0, parseInt(el.style.marginLeft || "0") - 40) + "px";
        triggerSave();
        return;
      }
      cur = (cur as HTMLElement).parentElement;
    }
    document.execCommand("outdent", false, undefined);
    triggerSave();
  }, [ensureCursor, triggerSave]);

  const handleLink = () => {
    const url = prompt("Enter URL:");
    if (url) execCmd("createLink", url);
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    const insertRange = savedSelectionRef.current
      ? savedSelectionRef.current.cloneRange()
      : null;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-img-wrapper", "true");
      wrapper.contentEditable = "false";
      wrapper.style.cssText =
        "display:block;position:relative;margin:8px 0;max-width:100%;cursor:pointer;";
      const img = document.createElement("img");
      img.src = src;
      img.style.cssText =
        "display:block;max-width:100%;height:auto;border-radius:3px;border:2px solid transparent;outline:none;box-sizing:border-box;";
      const handle = document.createElement("div");
      handle.style.cssText =
        "position:absolute;bottom:4px;right:4px;width:14px;height:14px;background:#2563eb;cursor:se-resize;border-radius:2px;opacity:0;transition:opacity 0.15s;z-index:10;";
      wrapper.onmouseenter = () => {
        handle.style.opacity = "1";
        if (selectedImageRef.current !== wrapper)
          img.style.border = "2px solid #2563eb";
      };
      wrapper.onmouseleave = () => {
        handle.style.opacity = "0";
        if (selectedImageRef.current !== wrapper)
          img.style.border = "2px solid transparent";
      };
      wrapper.onclick = (ev) => {
        ev.stopPropagation();
        if (selectedImageRef.current && selectedImageRef.current !== wrapper) {
          const pi = selectedImageRef.current.querySelector(
            "img",
          ) as HTMLImageElement;
          if (pi) {
            pi.style.outline = "none";
            pi.style.border = "2px solid transparent";
          }
        }
        selectedImageRef.current = wrapper;
        img.style.outline = "2px solid #2563eb";
        img.style.border = "2px solid #2563eb";
        const rect = wrapper.getBoundingClientRect();
        setImagePopup({
          el: wrapper,
          x: rect.left,
          y: rect.bottom + 8,
          float: (wrapper.style.float as any) || "none",
          width: img.offsetWidth,
        });
      };
      let resizing = false,
        startX = 0,
        startW = 0;
      handle.onmousedown = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        resizing = true;
        startX = ev.clientX;
        startW = img.offsetWidth;
        const onMove = (mv: MouseEvent) => {
          if (resizing) {
            img.style.width = Math.max(50, startW + mv.clientX - startX) + "px";
            img.style.height = "auto";
          }
        };
        const onUp = () => {
          resizing = false;
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          triggerSave();
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      };
      wrapper.appendChild(img);
      wrapper.appendChild(handle);
      if (
        insertRange &&
        editorRef.current.contains(insertRange.startContainer)
      ) {
        editorRef.current.focus();
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(insertRange);
        insertRange.deleteContents();
        insertRange.insertNode(wrapper);
        const nr = document.createRange();
        nr.setStartAfter(wrapper);
        nr.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(nr);
        savedSelectionRef.current = nr.cloneRange();
      } else {
        editorRef.current?.appendChild(wrapper);
      }
      requestAnimationFrame(() => {
        if (scrollContainerRef.current)
          scrollContainerRef.current.scrollTop = scrollTop;
      });
      triggerSave();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Insert table with full resize + add controls ──
  const insertTable = () => {
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    ensureCursor();

    const table = document.createElement("table");
    table.setAttribute("data-sf-table", "true");
    table.style.cssText =
      "border-collapse:collapse;width:100%;table-layout:auto;";

    const tbody = document.createElement("tbody");
    for (let r = 0; r < tableRows; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < tableCols; c++) {
        const td = document.createElement("td");
        td.style.cssText =
          "border:1px solid #c0c0c0;padding:8px 10px;min-width:60px;vertical-align:top;position:relative;";
        td.innerHTML = "<br>";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-sf-table-wrapper", "true");
    wrapper.style.cssText =
      "margin:16px 0;overflow-x:visible;position:relative;display:inline-block;width:100%;";
    wrapper.appendChild(table);

    const after = document.createElement("p");
    after.innerHTML = "<br>";

    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current?.contains(sel.anchorNode)
    ) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(after);
      range.insertNode(wrapper);
      const firstTd = table.querySelector("td");
      if (firstTd) {
        const nr = document.createRange();
        nr.setStart(firstTd, 0);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
        savedSelectionRef.current = nr.cloneRange();
      }
    } else {
      editorRef.current?.appendChild(wrapper);
      editorRef.current?.appendChild(after);
    }

    // Attach controls after DOM insertion
    setTimeout(() => attachTableControls(table), 50);
    setShowTableModal(false);
    triggerSave();
    requestAnimationFrame(() => {
      if (scrollContainerRef.current)
        scrollContainerRef.current.scrollTop = scrollTop;
    });
  };

  const applyImageFloat = (floatVal: "none" | "left" | "right") => {
    if (!imagePopup) return;
    const w = imagePopup.el;
    w.style.float = floatVal;
    w.style.display = floatVal === "none" ? "block" : "inline-block";
    if (floatVal === "left") {
      w.style.marginRight = "16px";
      w.style.marginLeft = "0";
      w.style.marginBottom = "8px";
    } else if (floatVal === "right") {
      w.style.marginLeft = "16px";
      w.style.marginRight = "0";
      w.style.marginBottom = "8px";
    } else {
      w.style.margin = "8px 0";
    }
    setImagePopup((prev) => (prev ? { ...prev, float: floatVal } : null));
    triggerSave();
  };

  const applyImageWidth = (width: number) => {
    if (!imagePopup) return;
    const img = imagePopup.el.querySelector("img") as HTMLImageElement;
    if (img) {
      img.style.width = width + "px";
      img.style.height = "auto";
    }
    setImagePopup((prev) => (prev ? { ...prev, width } : null));
    triggerSave();
  };

  const deleteImage = () => {
    if (!imagePopup) return;
    imagePopup.el.remove();
    selectedImageRef.current = null;
    setImagePopup(null);
    triggerSave();
  };

  const handleDownloadPDF = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const go = () => {
      const el = document.createElement("div");
      el.innerHTML = content;
      el.style.cssText = `font-family:${fontFamily};font-size:${fontSize}pt;line-height:1.8;color:#1a1a1a;`;
      (window as any)
        .html2pdf()
        .set({
          margin: [20, 20, 20, 20],
          filename: `${noteName || "note"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    };
    if ((window as any).html2pdf) go();
    else {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      s.onload = go;
      document.head.appendChild(s);
    }
  }, [noteName, fontFamily, fontSize]);

  const handleVoice = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    let final = "";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript + " ";
      }
      if (final && editorRef.current) {
        const sel = window.getSelection();
        if (
          sel &&
          sel.rangeCount > 0 &&
          editorRef.current.contains(sel.anchorNode)
        ) {
          const r = sel.getRangeAt(0);
          r.deleteContents();
          r.insertNode(document.createTextNode(final));
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        } else editorRef.current.innerText += final;
        final = "";
        triggerSave();
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    editorRef.current?.focus();
  };

  const handleAIPolish = () => {
    setShowAIModal(true);
    setPolishStep("choose");
    setAiResult("");
    setAiError("");
    setResourceFile(null);
    setResourceType(null);
    setYoutubeLink("");
  };
  const runPolishOnly = async () => {
    const nc = editorRef.current?.innerText || "";
    if (!nc.trim()) {
      setAiError("Your note is empty.");
      return;
    }
    setPolishStep("result");
    setAiLoading(true);
    setAiResult("");
    setAiError("");
    try {
      const res = await fetch("/api/gemini-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "polish-only", noteContent: nc }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAiResult(d.result || "");
    } catch (e: any) {
      setAiError(e.message || "Error");
    } finally {
      setAiLoading(false);
    }
  };
  const runPolishWithResource = async () => {
    const nc = editorRef.current?.innerText || "";
    if (!nc.trim()) {
      setAiError("Your note is empty.");
      return;
    }
    if (!resourceFile && !youtubeLink.trim()) return;
    setPolishStep("result");
    setAiLoading(true);
    setAiResult("");
    setAiError("");
    try {
      let parts: any[] = [];
      if (resourceType === "youtube")
        parts = [{ fileData: { fileUri: youtubeLink.trim() } }];
      else if (resourceFile) {
        const b64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(resourceFile);
        });
        parts = [
          {
            inlineData: {
              mimeType: resourceFile.type || "application/pdf",
              data: b64,
            },
          },
        ];
      }
      const resp = await fetch("/api/gemini-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "polish-resource",
          noteContent: nc,
          resourceParts: parts,
        }),
      });
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.error);
      setAiResult(d.result || "");
    } catch (e: any) {
      setAiError(e.message || "Error");
    } finally {
      setAiLoading(false);
    }
  };
  const applyAIResult = () => {
    if (editorRef.current && aiResult) {
      editorRef.current.innerText = aiResult;
      triggerSave();
    }
    closeModal();
  };
  const closeModal = () => {
    if (aiLoading) return;
    setShowAIModal(false);
    setPolishStep("choose");
    setAiResult("");
    setAiError("");
    setResourceFile(null);
    setResourceType(null);
    setYoutubeLink("");
  };

  const applyFontSize = (v: string) => {
    setFontSize(v);
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((el) => {
      (el as HTMLElement).removeAttribute("size");
      (el as HTMLElement).style.fontSize = `${v}pt`;
    });
    editorRef.current?.focus();
    triggerSave();
  };
  const applyFontFamily = (v: string) => {
    setFontFamily(v);
    execCmd("fontName", v);
  };
  const applyLineSpacing = (v: string) => {
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      while (node && node !== editorRef.current) {
        const tag = (node as HTMLElement).tagName?.toLowerCase();
        if (
          ["p", "div", "h1", "h2", "h3", "h4", "li", "blockquote"].includes(tag)
        ) {
          (node as HTMLElement).style.lineHeight = v;
          break;
        }
        node = (node as HTMLElement).parentElement;
      }
    }
    triggerSave();
  };

  const savedLabel =
    savedStatus === "saving"
      ? "Saving..."
      : secondsSaved < 5
        ? "Saved just now"
        : `Saved ${secondsSaved}s ago`;
  const FONTS = [
    { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
    { label: "Courier New", value: "'Courier New', Courier, monospace" },
    { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
    { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
    { label: "Garamond", value: "Garamond, serif" },
  ];
  const SIZES = [
    "8",
    "9",
    "10",
    "11",
    "12",
    "14",
    "16",
    "18",
    "20",
    "22",
    "24",
    "26",
    "28",
    "36",
    "48",
    "72",
  ];
  const LINE_SPACINGS = [
    { label: "Single", value: "1" },
    { label: "1.15", value: "1.15" },
    { label: "1.5", value: "1.5" },
    { label: "Double", value: "2" },
    { label: "2.5", value: "2.5" },
    { label: "Triple", value: "3" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="cursor-pointer flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <div className="w-px h-5 bg-gray-200" />
          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={noteName}
              onChange={(e) => setNoteName(e.target.value)}
              onBlur={() => {
                setIsEditingName(false);
                triggerSave();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingName(false);
                  triggerSave();
                }
              }}
              className="text-sm font-medium text-gray-800 border-b border-blue-400 outline-none bg-transparent px-1 w-48"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="cursor-pointer flex items-center gap-1.5 group"
            >
              <span className="text-sm font-medium text-gray-800">
                {noteName}
              </span>
              <svg
                className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            {savedStatus === "saving" ? (
              <svg
                className="w-3.5 h-3.5 animate-spin text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {savedLabel}
          </div>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleDownloadPDF();
            }}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download PDF
          </button>
        </div>
      </header>

      {/* Toolbar Row 1 */}
      <div className="flex items-center gap-0.5 px-3 py-1 bg-white border-b border-gray-100 shrink-0 flex-wrap">
        {[
          { cmd: "undo", d: "M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" },
          { cmd: "redo", d: "M21 10H11a8 8 0 00-8 8v2M21 10l-6 6M21 10l-6-6" },
        ].map((b) => (
          <button
            key={b.cmd}
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd(b.cmd);
            }}
            className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={b.d}
              />
            </svg>
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <select
          value={fontFamily}
          onMouseDown={() => saveSelection()}
          onChange={(e) => applyFontFamily(e.target.value)}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-700 outline-none bg-white"
          style={{ minWidth: 130 }}
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <select
          value={fontSize}
          onMouseDown={() => saveSelection()}
          onChange={(e) => applyFontSize(e.target.value)}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-700 outline-none bg-white w-14"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <select
          onMouseDown={() => saveSelection()}
          onChange={(e) => {
            restoreSelection();
            execCmd("formatBlock", e.target.value);
          }}
          defaultValue="p"
          className="text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-600 outline-none bg-white"
          style={{ minWidth: 100 }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Quote</option>
          <option value="pre">Code</option>
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {[
          { cmd: "bold", label: <b className="text-sm">B</b> },
          { cmd: "italic", label: <i className="text-sm">I</i> },
          { cmd: "underline", label: <u className="text-sm">U</u> },
          { cmd: "strikeThrough", label: <s className="text-sm">S</s> },
        ].map((b) => (
          <button
            key={b.cmd}
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd(b.cmd);
            }}
            className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700"
          >
            {b.label}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <label
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 relative"
          title="Text Color"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.18 3L2 21h3.5l1.64-4.5h7.73L16.5 21H20L10.82 3h.36zM8.35 13.5L11 6.75l2.65 6.75H8.35z" />
          </svg>
          <input
            type="color"
            className="absolute opacity-0 w-0 h-0"
            onMouseDown={() => saveSelection()}
            onChange={(e) => {
              restoreSelection();
              execCmd("foreColor", e.target.value);
            }}
          />
        </label>
        <label
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 relative"
          title="Highlight"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h4l10-10-4-4L3 17v4z"
            />
          </svg>
          <input
            type="color"
            className="absolute opacity-0 w-0 h-0"
            onMouseDown={() => saveSelection()}
            onChange={(e) => {
              restoreSelection();
              execCmd("hiliteColor", e.target.value);
            }}
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          {voiceSupported && (
            <button
              onClick={handleVoice}
              className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${isListening ? "bg-red-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
              </svg>
              {isListening ? "Stop" : "Voice"}
            </button>
          )}
          <button
            onClick={handleAIPolish}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            Polish with AI
          </button>
        </div>
      </div>

      {/* Toolbar Row 2 */}
      <div className="flex items-center gap-0.5 px-3 py-1 bg-white border-b border-gray-200 shrink-0 flex-wrap">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleBulletList();
          }}
          title="Bullet List"
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="4.5" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle
              cx="4.5"
              cy="12"
              r="1.5"
              fill="currentColor"
              stroke="none"
            />
            <circle
              cx="4.5"
              cy="18"
              r="1.5"
              fill="currentColor"
              stroke="none"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 6h12M8 12h12M8 18h12"
            />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleOrderedList();
          }}
          title="Numbered List"
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 6h12M8 12h12M8 18h12"
            />
            <text
              x="1"
              y="7.5"
              fontSize="6"
              fill="currentColor"
              stroke="none"
              fontWeight="bold"
            >
              1
            </text>
            <text
              x="1"
              y="13.5"
              fontSize="6"
              fill="currentColor"
              stroke="none"
              fontWeight="bold"
            >
              2
            </text>
            <text
              x="1"
              y="19.5"
              fontSize="6"
              fill="currentColor"
              stroke="none"
              fontWeight="bold"
            >
              3
            </text>
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleIndent();
          }}
          title="Indent"
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6h18M3 12h12M3 18h15M15 9l3 3-3 3"
            />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleOutdent();
          }}
          title="Outdent"
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6h18M9 12h12M6 18h15M6 9l-3 3 3 3"
            />
          </svg>
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {[
          { cmd: "justifyLeft", d: "M4 6h16M4 12h10M4 18h14" },
          { cmd: "justifyCenter", d: "M4 6h16M7 12h10M5 18h14" },
          { cmd: "justifyRight", d: "M4 6h16M10 12h10M6 18h14" },
          { cmd: "justifyFull", d: "M4 6h16M4 12h16M4 18h16" },
        ].map((b) => (
          <button
            key={b.cmd}
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd(b.cmd);
            }}
            className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={b.d}
              />
            </svg>
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <select
          onMouseDown={() => saveSelection()}
          onChange={(e) => applyLineSpacing(e.target.value)}
          defaultValue=""
          className="text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-600 outline-none bg-white"
        >
          <option value="" disabled>
            Line spacing
          </option>
          {LINE_SPACINGS.map((ls) => (
            <option key={ls.value} value={ls.value}>
              {ls.label}
            </option>
          ))}
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleLink();
          }}
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </button>
        <label
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
          title="Insert Image"
          onMouseDown={() => saveSelection()}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageInsert}
          />
        </label>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
            setShowTableModal(true);
          }}
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z"
            />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("insertHorizontalRule");
          }}
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 12h16"
            />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("superscript");
          }}
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 text-xs font-bold"
        >
          X<sup>2</sup>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("subscript");
          }}
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 text-xs font-bold"
        >
          X<sub>2</sub>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("removeFormat");
          }}
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-8 py-8"
      >
        <div className="max-w-3xl mx-auto">
          {isListening && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              Listening…
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={triggerSave}
            className="min-h-[600px] bg-white rounded-2xl shadow-sm border border-gray-200 px-10 py-10 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            style={{
              fontFamily,
              fontSize: `${fontSize}pt`,
              lineHeight: "1.8",
              color: "#202124",
            }}
            data-placeholder="Start typing your notes here…"
          />
        </div>
      </div>

      {/* Image Popup */}
      {imagePopup && (
        <div
          className="img-popup fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-72"
          style={{
            top: Math.min(imagePopup.y, window.innerHeight - 290),
            left: Math.min(imagePopup.x, window.innerWidth - 300),
          }}
        >
          <p className="text-xs font-semibold text-gray-700 mb-3">
            Image options
          </p>
          <p className="text-[11px] text-gray-500 mb-2 font-medium">Position</p>
          <div className="flex gap-2 mb-4">
            {[
              {
                val: "none" as const,
                label: "Inline",
                icon: (
                  <svg
                    className="w-5 h-5 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="3"
                      y="6"
                      width="8"
                      height="6"
                      rx="1"
                      strokeWidth={1.5}
                    />
                    <path
                      strokeLinecap="round"
                      strokeWidth={1.5}
                      d="M3 16h18M3 19h18"
                    />
                  </svg>
                ),
              },
              {
                val: "left" as const,
                label: "Left",
                icon: (
                  <svg
                    className="w-5 h-5 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="2"
                      y="4"
                      width="9"
                      height="7"
                      rx="1"
                      strokeWidth={1.5}
                    />
                    <path
                      strokeLinecap="round"
                      strokeWidth={1.5}
                      d="M13 6h8M13 9h8M2 14h20M2 17h20M2 20h20"
                    />
                  </svg>
                ),
              },
              {
                val: "right" as const,
                label: "Right",
                icon: (
                  <svg
                    className="w-5 h-5 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="13"
                      y="4"
                      width="9"
                      height="7"
                      rx="1"
                      strokeWidth={1.5}
                    />
                    <path
                      strokeLinecap="round"
                      strokeWidth={1.5}
                      d="M2 6h9M2 9h9M2 14h20M2 17h20M2 20h20"
                    />
                  </svg>
                ),
              },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => applyImageFloat(opt.val)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${imagePopup.float === opt.val ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mb-1.5 font-medium">
            Width (px)
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              min={50}
              max={800}
              value={imagePopup.width}
              onChange={(e) => applyImageWidth(Number(e.target.value))}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-400"
            />
            <div className="flex gap-1">
              {[200, 400, 600].map((w) => (
                <button
                  key={w}
                  onClick={() => applyImageWidth(w)}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] font-medium cursor-pointer transition-all ${imagePopup.width === w ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={deleteImage}
              className="cursor-pointer flex-1 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete image
            </button>
            <button
              onClick={() => setImagePopup(null)}
              className="cursor-pointer px-3 py-2 border border-gray-200 hover:bg-gray-50 text-xs text-gray-500 rounded-xl"
            >
              Close
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Press Delete or Backspace to remove
          </p>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setShowTableModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-72 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-gray-800 mb-4">
                Insert Table
              </h3>
              <div className="flex gap-4 mb-5">
                {(
                  [
                    ["Rows", tableRows, setTableRows],
                    ["Columns", tableCols, setTableCols],
                  ] as const
                ).map(([label, val, setter]: any) => (
                  <div key={label} className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">
                      {label}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={val}
                      onChange={(e) => setter(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTableModal(false)}
                  className="cursor-pointer flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-500 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={insertTable}
                  className="cursor-pointer flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl active:scale-95"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* AI Polish Modal */}
      {showAIModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={closeModal}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-7 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Polish with AI
                    </p>
                    <p className="text-xs text-gray-400">
                      {polishStep === "choose"
                        ? "Choose how to polish"
                        : polishStep === "result"
                          ? aiLoading
                            ? "Polishing..."
                            : "Ready"
                          : polishStep === "polish-only"
                            ? "Clean up with AI"
                            : "Enrich with resource"}
                    </p>
                  </div>
                </div>
                {!aiLoading && (
                  <button
                    onClick={closeModal}
                    className="cursor-pointer text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {polishStep === "choose" && (
                <div className="px-7 py-6 space-y-3">
                  {[
                    {
                      step: "polish-only" as PolishMode,
                      title: "Polish only",
                      desc: "Fix spelling, grammar, clarity and flow.",
                      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                    },
                    {
                      step: "polish-resource" as PolishMode,
                      title: "Polish with resource",
                      desc: "Upload PDF, audio or YouTube — AI enriches your note.",
                      icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.step}
                      onClick={() => setPolishStep(opt.step)}
                      className="cursor-pointer w-full text-left border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl px-5 py-4 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                          <svg
                            className="w-4 h-4 text-gray-500 group-hover:text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={opt.icon}
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {opt.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                            {opt.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {polishStep === "polish-only" && (
                <div className="px-7 py-6">
                  <div className="bg-gray-50 rounded-xl px-5 py-4 mb-5">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      What AI will do:
                    </p>
                    <ul className="space-y-1.5">
                      {[
                        "Fix spelling and grammar",
                        "Improve clarity and flow",
                        "Structure writing better",
                        "Keep all your original content",
                      ].map((t, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-gray-500"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPolishStep("choose")}
                      className="cursor-pointer px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-sm text-gray-500 rounded-xl"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={runPolishOnly}
                      className="cursor-pointer flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl active:scale-95"
                    >
                      Polish my note
                    </button>
                  </div>
                </div>
              )}
              {polishStep === "polish-resource" && (
                <div className="px-7 py-6">
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Upload your resource and AI will expand and enrich your
                    note.
                  </p>
                  <div className="flex gap-2 mb-4">
                    {[
                      { type: "file" as const, label: "PDF / Audio" },
                      { type: "youtube" as const, label: "YouTube" },
                    ].map((opt) => (
                      <button
                        key={opt.type}
                        onClick={() => {
                          setResourceType(opt.type);
                          setResourceFile(null);
                          setYoutubeLink("");
                        }}
                        className={`cursor-pointer px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${resourceType === opt.type ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {resourceType === "file" && (
                    <div
                      onClick={() => resourceInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl px-5 py-6 flex flex-col items-center gap-2 mb-4"
                    >
                      <svg
                        className="w-8 h-8 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      <p className="text-xs text-gray-500 font-medium">
                        {resourceFile ? resourceFile.name : "Click to upload"}
                      </p>
                      <input
                        ref={resourceInputRef}
                        type="file"
                        accept=".pdf,.mp3,.mp4,.wav,.m4a,.ogg,.webm"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            setResourceFile(e.target.files[0]);
                        }}
                      />
                    </div>
                  )}
                  {resourceType === "youtube" && (
                    <input
                      type="url"
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-3 border border-gray-200 focus:border-blue-500 rounded-xl text-sm outline-none mb-4 placeholder-gray-300"
                    />
                  )}
                  {!resourceType && (
                    <div className="mb-4 h-20 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                      <p className="text-xs text-gray-300">
                        Select a resource type above
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPolishStep("choose")}
                      className="cursor-pointer px-4 py-2.5 border border-gray-200 text-sm text-gray-500 rounded-xl hover:bg-gray-50"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={runPolishWithResource}
                      disabled={
                        !resourceType ||
                        (resourceType === "file" && !resourceFile) ||
                        (resourceType === "youtube" && !youtubeLink.trim())
                      }
                      className="cursor-pointer flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl active:scale-95"
                    >
                      Polish with resource
                    </button>
                  </div>
                </div>
              )}
              {polishStep === "result" && (
                <>
                  <div className="px-7 py-5">
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Polishing...</p>
                      </div>
                    ) : aiError ? (
                      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-4 text-sm text-red-500">
                        {aiError}
                      </div>
                    ) : (
                      <div
                        className="bg-gray-50 rounded-xl p-4 max-h-72 overflow-y-auto text-sm text-gray-700 leading-7 whitespace-pre-wrap"
                        style={{ fontFamily: "Georgia,serif" }}
                      >
                        {aiResult}
                      </div>
                    )}
                  </div>
                  {!aiLoading && (aiResult || aiError) && (
                    <div className="px-7 pb-6 flex gap-3">
                      {aiResult && (
                        <button
                          onClick={applyAIResult}
                          className="cursor-pointer flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl active:scale-95"
                        >
                          Replace my note with this
                        </button>
                      )}
                      <button
                        onClick={closeModal}
                        className="cursor-pointer px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 rounded-xl"
                      >
                        Keep original
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] ul {
          list-style-type: disc !important;
          padding-left: 32px !important;
          margin: 6px 0 !important;
          display: block !important;
        }
        [contenteditable] ol {
          list-style-type: decimal !important;
          padding-left: 32px !important;
          margin: 6px 0 !important;
          display: block !important;
        }
        [contenteditable] li {
          display: list-item !important;
          margin-bottom: 3px !important;
        }
        [contenteditable] ul li {
          list-style-type: disc !important;
        }
        [contenteditable] ol li {
          list-style-type: decimal !important;
        }
        [contenteditable] table {
          border-collapse: collapse;
          width: 100%;
        }
        [contenteditable] td,
        [contenteditable] th {
          border: 1px solid #c0c0c0;
          padding: 8px 10px;
          min-width: 30px;
          vertical-align: top;
          position: relative;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
        }
        [contenteditable] blockquote {
          border-left: 3px solid #3b82f6;
          margin: 8px 0;
          padding-left: 16px;
          color: #6b7280;
          font-style: italic;
        }
        [contenteditable] pre {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 12px 16px;
          font-family: "Courier New", monospace;
          font-size: 12px;
          overflow-x: auto;
          border: 1px solid #e5e7eb;
        }
        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
        }
        [contenteditable] hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 16px 0;
        }
        [contenteditable] h1 {
          font-size: 24pt;
          font-weight: 700;
          margin: 16px 0 8px;
        }
        [contenteditable] h2 {
          font-size: 18pt;
          font-weight: 600;
          margin: 14px 0 6px;
        }
        [contenteditable] h3 {
          font-size: 14pt;
          font-weight: 600;
          margin: 12px 0 4px;
        }
        [contenteditable] h4 {
          font-size: 12pt;
          font-weight: 600;
          margin: 10px 0 4px;
        }
        [contenteditable] p {
          margin: 0 0 6px;
        }
        [data-sf-resizer]:hover {
          background: rgba(37, 99, 235, 0.35) !important;
        }
      `}</style>
    </div>
  );
}
