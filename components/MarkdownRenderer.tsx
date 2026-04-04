import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import SmilesViewer from "./SmilesViewer";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  // Pre-process content to handle [SMILES: ...] pattern if it's not in a code block
  const processContent = (text: string) => {
    // This is a simple strategy: we'll split the text by the SMILES pattern
    // and render them as parts. However, ReactMarkdown is better at parsing structure.
    // A better way is to use a plugin, but for simplicity and speed, 
    // we'll rely on the AI using the standard ````smiles block which we already handle.
    // If we want [SMILES: ...] we can add it as a custom component if we wrap it in a pseudo-tag.
    return text.replace(/\[SMILES:\s*([^\]]+)\]/g, "```smiles\n$1\n```");
  };

  return (
    <div className={`markdown-content ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-md font-semibold mt-2 mb-1" {...props} />,
          p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-2" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-200 pl-4 italic my-2" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";

            if (!inline && lang === "smiles") {
              return <SmilesViewer smiles={String(children).trim()} />;
            }
            
            return inline ? (
              <code className="bg-gray-100 px-1 rounded text-sm font-mono text-blue-600" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-gray-100 p-4 rounded-2xl overflow-x-auto my-4 border border-gray-100">
                <code className="text-sm font-mono" {...props}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {processContent(content)}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
