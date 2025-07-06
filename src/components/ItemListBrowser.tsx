import React from 'react';

interface ItemListBrowserProps<T> {
  isOpen: boolean;
  onClose: () => void;
  items: T[];
  currentItemId: string | null;
  onItemSelect: (item: T) => void;
  onNewItem: () => void;
  onDeleteItem: (id: string) => void;
  renderItemTitle: (item: T) => React.ReactNode;
  renderItemDate: (item: T) => React.ReactNode;
  getItemId: (item: T) => string;
  newItemLabel?: string;
  canDeleteItem?: (item: T) => boolean;
  closeOnNewItem?: boolean;
  renderItemActions?: (item: T) => React.ReactNode;
}

export default function ItemListBrowser<T>({
  isOpen,
  onClose,
  items,
  currentItemId,
  onItemSelect,
  onNewItem,
  onDeleteItem,
  renderItemTitle,
  renderItemDate,
  getItemId,
  newItemLabel = '+ New Item',
  canDeleteItem,
  closeOnNewItem = true,
  renderItemActions,
}: ItemListBrowserProps<T>) {
  return (
    <>
      {isOpen && (
        <>
          {/* Scrim */}
          <div
            className="fixed top-0 left-0 w-full h-full z-[200] transition-opacity duration-300"
            onClick={e => { onClose(); }}
            style={{ background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }}
          />
          {/* Modal */}
          <div className="fixed z-[210] top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
            <div
              className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-2xl h-[672px] shadow-xl flex flex-col transition-transform duration-300 scale-100 pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* New Item Button */}
              <div className="flex justify-center px-4 pt-6 pb-4">
                <button
                  onClick={() => {
                    onNewItem();
                    if (closeOnNewItem) onClose();
                  }}
                  className="px-5 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors text-base font-medium shadow-none"
                >
                  {newItemLabel}
                </button>
              </div>

              {/* List */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 scrollbar-hide">
                {items.length > 0 ? (
                  <div>
                    {items.map((item, index) => {
                      const id = getItemId(item);
                      const deletable = canDeleteItem ? canDeleteItem(item) : true;
                      return (
                        <div key={id}>
                          <div
                            onClick={() => {
                              onItemSelect(item);
                              onClose();
                            }}
                            className={`flex items-center justify-between px-4 py-4 cursor-pointer transition-all ${
                              currentItemId === id
                                ? 'bg-[rgba(255,255,255,0.1)] rounded-[12px]' : 'hover:bg-white/5 hover:rounded-[12px]'
                            }`}
                          >
                            <div className="truncate text-white text-base">
                              {renderItemTitle(item)}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-gray-400 text-sm">
                                {renderItemDate(item)}
                              </span>
                              {renderItemActions && renderItemActions(item)}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!deletable) return;
                                  if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                                    onDeleteItem(id);
                                  }
                                }}
                                className={`text-gray-400 p-2 transition-all rounded ${deletable ? 'hover:text-white hover:bg-white/10' : 'opacity-40 cursor-not-allowed text-gray-600'}`}
                                title={deletable ? 'Delete' : 'Cannot delete'}
                                disabled={!deletable}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-start justify-center h-full pt-8">
                    <div className="text-center text-gray-400">
                      <p className="text-sm leading-relaxed max-w-xs">
                        {newItemLabel === '+ New Narrative' 
                          ? "No narratives yet"
                          : newItemLabel === '+ New Conversation'
                          ? "No conversations yet"
                          : "No items yet"
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
} 