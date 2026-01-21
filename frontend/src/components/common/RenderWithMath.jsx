import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Helper to render text with LaTeX
const RenderWithMath = ({ text }) => {
    if (!text) return null;

    // Pattern for Markdown images: ![alt](url)
    const imageParts = text.split(/(!\[.*?\]\(.*?\))/g);

    return (
        <span>
            {imageParts.map((part, i) => {
                const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
                if (imgMatch) {
                    return (
                        <div key={i} style={{ margin: '10px 0', maxWidth: '100%' }}>
                            <img
                                src={imgMatch[2]}
                                alt={imgMatch[1]}
                                style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '400px', objectFit: 'contain' }}
                            />
                        </div>
                    );
                } else {
                    return <RenderLatex key={i} text={part} />;
                }
            })}
        </span>
    );
};

const RenderLatex = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$[\s\S]*?(?<!\\)\$)/g);

    return (
        <React.Fragment>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={index} math={math} />;
                } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={index} math={math} />;
                } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    const math = part.slice(2, -2);
                    return <InlineMath key={index} math={math} />;
                } else if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1);
                    return <InlineMath key={index} math={math} />;
                } else {
                    return <span key={index}>{part}</span>;
                }
            })}
        </React.Fragment>
    );
};

export default RenderWithMath;
