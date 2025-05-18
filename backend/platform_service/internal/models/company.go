package models

type Company struct {
	Guid          string  `json:"guid"`
	Name          string  `json:"name"`
	Description   *string `json:"description,omitempty"`
	Email         *string `json:"email,omitempty"`
	Phone         *string `json:"phone,omitempty"`
	Website       *string `json:"website,omitempty"`
	Address       *string `json:"address,omitempty"`
	Avatar        *string `json:"avatar,omitempty"`
	ShortLinkName *string `json:"short_link_name,omitempty"`
}

type ShortCompany struct {
	Guid          string  `json:"guid"`
	Name          string  `json:"name"`
	ShortLinkName *string `json:"short_link_name,omitempty"`
}
