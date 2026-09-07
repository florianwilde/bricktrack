import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CancelReservation } from '@/components/wunschlisten/cancel-reservation';
import { getWishlistByShareToken, listWishlistItems } from '@/lib/queries/wishlists';

export const metadata: Metadata = {
  title: 'Reservierung aufheben',
  robots: { index: false, follow: false },
};

/** The link a visitor receives after reserving a gift. */
export default async function CancelReservationPage({
  params,
}: {
  params: Promise<{ shareToken: string; itemId: string; token: string }>;
}) {
  const { shareToken, itemId, token } = await params;

  const list = getWishlistByShareToken(shareToken);
  if (!list || !list.isPublic) notFound();

  const item = listWishlistItems(list.id).find((row) => row.id === itemId);
  if (!item) notFound();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <CancelReservation
        shareToken={shareToken}
        itemId={itemId}
        token={token}
        setName={item.setName}
        setNumber={item.setNumber}
        isReserved={item.reservedAt !== null}
        listTitle={list.title}
      />
    </div>
  );
}
