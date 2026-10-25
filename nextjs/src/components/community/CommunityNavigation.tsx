"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, FileText, MessageSquare, Plus } from "lucide-react";
import styles from "./community.module.css";
export function CommunityNavigation() {
  const path = usePathname();
  return (
    <>
      <header className={styles.header}>
        <h1>Discuss</h1>
        {!path.endsWith("/new") && !path.endsWith("/edit") && (
          <Link className="ui-button ui-button-primary" href="/community/new">
            <Plus size={18} strokeWidth={1.5} />
            New post
          </Link>
        )}
      </header>
      <nav className={styles.tabs} aria-label="Discussion navigation">
        {[
          ["/community", "All posts", MessageSquare],
          ["/community/my-posts", "My posts", FileText],
          ["/community/saved", "Saved", Bookmark],
        ].map(([href, label, Icon]) => (
          <Link
            key={String(href)}
            href={String(href)}
            aria-current={path === href ? "page" : undefined}
          >
            {typeof Icon !== "string" && <Icon size={18} strokeWidth={1.5} />}
            <span>{String(label)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
