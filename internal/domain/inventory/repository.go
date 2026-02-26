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

type RecipeListFilter struct {
	ActiveOnly   bool
	OutputItemID *int64
	Search       string
}

type Repository interface {
	CreateItem(item *Item) error
	UpdateItem(item *Item) error
	ListItems(filter ItemListFilter) ([]Item, error)

	CreatePackagingProfile(profile *PackagingProfile) error
	ListPackagingProfiles(filter PackagingProfileListFilter) ([]PackagingProfile, error)

	CreateRecipe(recipe *Recipe) error
	UpdateRecipe(recipe *Recipe) error
	ListRecipes(filter RecipeListFilter) ([]Recipe, error)

	CreateUnitConversionRule(rule *UnitConversionRule) error
	FindUnitConversionRule(lookup UnitConversionLookup) (*UnitConversionRule, error)
	ListUnitConversionRules(filter UnitConversionRuleFilter) ([]UnitConversionRule, error)

	CreateBatch(batch *Batch) error
	UpdateBatch(batch *Batch) error

	CreateGRN(grn *GRN) error
	UpdateGRN(grn *GRN) error
}
