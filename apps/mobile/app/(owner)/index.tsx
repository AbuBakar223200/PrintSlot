import { Redirect, type Href } from 'expo-router';

export default function OwnerIndexScreen() {
  // Cast: owner routes are new and may not be in the generated typed-routes union yet.
  return <Redirect href={'/(owner)/shop' as Href} />;
}
