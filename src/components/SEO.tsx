import React, { useEffect } from 'react';

type Props = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
};

const setEl = (selector: string, create: () => HTMLElement) => {
  let el = document.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
};

export const SEO: React.FC<Props> = ({ title, description, canonicalPath, image }) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
    if (description) {
      const metaDesc = setEl('meta[name="description"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('name', 'description');
        return m;
      });
      metaDesc.setAttribute('content', description);
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.opulentcosmetics.shop';
    const canonicalUrl = canonicalPath ? new URL(canonicalPath, origin).toString() : origin + '/';
    const linkCanonical = setEl('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    });
    linkCanonical.setAttribute('href', canonicalUrl);
    if (title) {
      const ogTitle = setEl('meta[property="og:title"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('property', 'og:title');
        return m;
      });
      ogTitle.setAttribute('content', title);
    }
    if (description) {
      const ogDesc = setEl('meta[property="og:description"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('property', 'og:description');
        return m;
      });
      ogDesc.setAttribute('content', description);
    }
    const ogUrl = setEl('meta[property="og:url"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:url');
      return m;
    });
    ogUrl.setAttribute('content', canonicalUrl);
    if (image) {
      const ogImage = setEl('meta[property="og:image"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('property', 'og:image');
        return m;
      });
      ogImage.setAttribute('content', image);
    }
    if (title) {
      const twTitle = setEl('meta[name="twitter:title"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('name', 'twitter:title');
        return m;
      });
      twTitle.setAttribute('content', title);
    }
    if (description) {
      const twDesc = setEl('meta[name="twitter:description"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('name', 'twitter:description');
        return m;
      });
      twDesc.setAttribute('content', description);
    }
    if (image) {
      const twImage = setEl('meta[name="twitter:image"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('name', 'twitter:image');
        return m;
      });
      twImage.setAttribute('content', image);
    }
  }, [title, description, canonicalPath, image]);
  return null;
};

