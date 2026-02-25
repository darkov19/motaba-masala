package inventory

type ItemListFilter struct {
	ActiveOnly bool
	ItemType   ItemType
	Search     string
}

type PackagingProfileListFilter struct {
	ActiveOnly bool
	Search     string
	PackMode   string
}

type Repository interface {
	CreateItem(item *Item) error
	UpdateItem(item *Item) error
	ListItems(filter ItemListFilter) ([]Item, error)

	CreatePackagingProfile(profile *PackagingProfile) error
	ListPackagingProfiles(filter PackagingProfileListFilter) ([]PackagingProfile, error)

	CreateBatch(batch *Batch) error
	UpdateBatch(batch *Batch) error

	CreateGRN(grn *GRN) error
	UpdateGRN(grn *GRN) error
}
