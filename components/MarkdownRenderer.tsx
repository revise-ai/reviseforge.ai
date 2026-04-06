import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import SmilesViewer from "./SmilesViewer";
import MermaidViewer from "./MermaidViewer";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const processContent = (text: string) => {
    return text.replace(/\[SMILES:\s*([^\]]+)\]/g, "```smiles\n$1\n```");
  };

  return (
    <div className={`markdown-content ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
          h2: ({ ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
          h3: ({ ...props }) => <h3 className="text-md font-semibold mt-2 mb-1" {...props} />,
          p: ({ ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc ml-6 mb-6 space-y-3" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal ml-6 mb-6 space-y-3" {...props} />,
          li: ({ ...props }) => <li className="mb-1 leading-relaxed pl-1" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-gray-200 pl-4 italic my-2" {...props} />
          ),
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";

            if (!inline && lang === "smiles") {
              return <SmilesViewer smiles={String(children).trim()} />;
            }

            if (!inline && lang === "mermaid") {
              return <MermaidViewer chart={String(children).trim()} />;
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
