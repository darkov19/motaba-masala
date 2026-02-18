package inventory

type Repository interface {
	CreateItem(item *Item) error
	UpdateItem(item *Item) error

	CreateBatch(batch *Batch) error
	UpdateBatch(batch *Batch) error

	CreateGRN(grn *GRN) error
	UpdateGRN(grn *GRN) error
}
