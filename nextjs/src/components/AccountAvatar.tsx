import type { Account } from './AccountProvider';

export function AccountAvatar({ account, name, className }: { account: Account | null; name: string; className: string }) {
  return <span className={className} aria-hidden="true">
    {account?.avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- Small avatars use existing validated image providers.
      <img src={account.avatarUrl} alt="" width={36} height={36} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit' }}/>
    ) : name.slice(0,2)}
  </span>;
}
