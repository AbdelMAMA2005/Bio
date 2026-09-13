type Props = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: (count: number) => string;
};

export function Pagination({ page, limit, total, onPageChange, itemLabel }: Props) {
  const shownCount = Math.min(limit, Math.max(0, total - (page - 1) * limit));
  const hasNext = page * limit < total;

  return (
    <div className="pagination">
      <span>
        {itemLabel ? itemLabel(shownCount) : `${shownCount} affiché(s)`} sur {total}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Précédent
        </button>
        <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Suivant
        </button>
      </div>
    </div>
  );
}
