const fs = require('fs');
let text = fs.readFileSync('components/ChatMessage.tsx', 'utf-8');

text = text.replace(
  /const allToolsDone = toolElements\.length > 0 && message\.parts[\s\S]*?\}\)/,
  `const allToolsDone = toolElements.length > 0 && (
    message.toolInvocations 
      ? message.toolInvocations.every((inv: any) => inv.state === 'result' || inv.state === 'error')
      : message.parts
          .filter((p: any) => isToolUIPart(p) || p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("tool-")))
          .every((p: any) => {
            const state = p.toolInvocation?.state || p.state || (typeof p.type === "string" ? p.type : "")
            return state === "output-available" || state === "result" || state === "output-error" || state === "tool-output-available" || state === "tool-output-error"
          })
  )`
);
fs.writeFileSync('components/ChatMessage.tsx', text);
