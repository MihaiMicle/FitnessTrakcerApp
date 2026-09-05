import UserProfileClient from './UserProfileClient';

export async function generateStaticParams() {
  return [{ username: 'placeholder' }];
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return <UserProfileClient params={params} />;
}