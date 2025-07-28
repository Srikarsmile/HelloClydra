import { SearchResultCard } from './SearchResultCard';

export function SearchResults({ hits, query }: {
  hits: Array<{
    url: string;
    title: string;
    content: string;
    published_date?: string;
  }>;
  query: string;
}) {
  if (!hits.length) {
    return null;
  }

  return (
    <div className="grid gap-6 mt-8 grid-cols-1 lg:grid-cols-2">
      {hits.map((hit, index) => (
        <SearchResultCard 
          key={hit.url + index} 
          hit={hit} 
          query={query}
        />
      ))}
    </div>
  );
}