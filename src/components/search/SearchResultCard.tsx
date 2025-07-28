import Image from 'next/image';
import { highlight } from '@/lib/highlight';

export function SearchResultCard({ hit, query }: {
  hit: {
    url: string;
    title: string;
    content: string;
    published_date?: string;
  };
  query: string;
}) {
  const domain = new URL(hit.url).hostname.replace(/^www\./, '');
  
  return (
    <a 
      href={hit.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group rounded-xl border border-[var(--outline)]
                 bg-[var(--card)] hover:shadow-card transition-all duration-200
                 flex flex-col gap-3 p-4 hover:border-[var(--accent)]"
    >
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Image
          src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
          alt="" 
          width={16} 
          height={16} 
          className="rounded"
        />
        <span className="font-medium">{domain}</span>
        {hit.published_date && (
          <>
            <span>·</span>
            <span>{hit.published_date}</span>
          </>
        )}
      </div>
      
      <h3 className="font-semibold text-[var(--fg)] group-hover:text-[var(--accent)] 
                     transition-colors line-clamp-2 text-lg">
        {hit.title}
      </h3>
      
      <p
        className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlight(hit.content, query) }}
      />
    </a>
  );
}