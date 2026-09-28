import { describe, expect, it } from "vitest";
import { editorKey } from "./keyboard";

function key(init: KeyboardEventInit, target?: EventTarget): KeyboardEvent {
  const event = new KeyboardEvent("keydown", init);
  if (target) Object.defineProperty(event, "target", { value: target });
  return event;
}

describe("editorKey", () => {
  it("maps undo, redo and moves", () => {
    expect(editorKey(key({ key: "z", metaKey: true }))).toBe("undo");
    expect(editorKey(key({ key: "z", ctrlKey: true }))).toBe("undo");
    expect(editorKey(key({ key: "Z", metaKey: true, shiftKey: true }))).toBe("redo");
    expect(editorKey(key({ key: "ArrowUp", altKey: true }))).toBe("move_up");
    expect(editorKey(key({ key: "ArrowDown", altKey: true }))).toBe("move_down");
    expect(editorKey(key({ key: "ArrowDown" }))).toBeNull();
  });

  it("leaves every shortcut to the browser while a text field has focus", () => {
    const input = document.createElement("input");
    expect(editorKey(key({ key: "z", metaKey: true }, input))).toBeNull();
    expect(editorKey(key({ key: "Z", metaKey: true, shiftKey: true }, input))).toBeNull();
    expect(editorKey(key({ key: "ArrowUp", altKey: true }, input))).toBeNull();
  });

  it("removes a block on Delete or Backspace only outside text fields", () => {
    expect(editorKey(key({ key: "Delete" }, document.body))).toBe("remove");
    expect(editorKey(key({ key: "Backspace" }, document.createElement("input")))).toBeNull();
    expect(editorKey(key({ key: "Delete" }, document.createElement("textarea")))).toBeNull();
    const editable = document.createElement("div");
    Object.defineProperty(editable, "isContentEditable", { value: true });
    expect(editorKey(key({ key: "Backspace" }, editable))).toBeNull();
  });
});
