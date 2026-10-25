import { CommunityNavigation } from "@/components/community/CommunityNavigation";
import styles from "@/components/community/community.module.css";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <CommunityNavigation />
      {children}
    </div>
  );
}
