import { Redirect, type Href } from 'expo-router';

export default function AdminIndexScreen() {
  // Cast: admin routes are new and may not be in the generated typed-routes union yet.
  return <Redirect href={'/(admin)/shops' as Href} />;
}
