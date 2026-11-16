// Public web pages (GitHub Pages, served from the repo's /docs folder).
export const SITE_URL = 'https://roberttonikyan.github.io/veyra';

export const privacyUrl = (lang: string) => `${SITE_URL}/privacy.html?lang=${lang}`;
export const deleteAccountUrl = (lang: string) => `${SITE_URL}/delete.html?lang=${lang}`;
