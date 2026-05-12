# AGENTS.md — PrintSlot React Native Rules

> Authoritative rule reference for AI agents and LLMs working on `apps/mobile`.
> Rules sourced from `vercel-react-native-skills` and adapted for the PrintSlot stack.
> Stack: **Expo Router · React Native Reanimated · TanStack Query · Zustand · FlashList · expo-image**

---

## Table of Contents

1. [Core Rendering](#1-core-rendering) — CRITICAL
2. [List Performance](#2-list-performance) — HIGH
3. [Animation](#3-animation) — HIGH
4. [Scroll Performance](#4-scroll-performance) — HIGH
5. [Navigation](#5-navigation) — HIGH
6. [React State](#6-react-state) — MEDIUM
7. [State Architecture](#7-state-architecture) — MEDIUM
8. [React Compiler](#8-react-compiler) — MEDIUM
9. [User Interface](#9-user-interface) — MEDIUM
10. [Design System](#10-design-system) — MEDIUM
11. [Monorepo](#11-monorepo) — LOW
12. [Third-Party Dependencies](#12-third-party-dependencies) — LOW
13. [JavaScript](#13-javascript) — LOW
14. [Fonts](#14-fonts) — LOW
15. [PrintSlot-Specific Rules](#15-printslot-specific-rules)

---

## 1. Core Rendering

**Impact: CRITICAL** — Violations cause runtime crashes or broken UI.

### 1.1 Never Use && with Potentially Falsy Values

Never `{value && <Component />}` when `value` could be `0` or `""`. These are falsy but JSX-renderable — React Native crashes rendering them outside `<Text>`.

```tsx
// CRASH if count=0 or name=""
{name && <Text>{name}</Text>}
{count && <Text>{count} items</Text>}

// CORRECT: ternary with null
{name ? <Text>{name}</Text> : null}
{count > 0 ? <Text>{count} items</Text> : null}

// CORRECT: explicit boolean
{!!name && <Text>{name}</Text>}

// BEST: early return
if (!name) return null
```

Enable `react/jsx-no-leaked-render` from `eslint-plugin-react` to catch automatically.

### 1.2 Wrap Strings in Text Components

Strings must be inside `<Text>`. React Native crashes if a string is a direct child of `<View>`.

```tsx
// CRASH
<View>Hello, {name}!</View>

// CORRECT
<View><Text>Hello, {name}!</Text></View>
```

---

## 2. List Performance

**Impact: HIGH**

### 2.1 Use FlashList for Any List

Use `FlashList` (or `LegendList`) instead of `ScrollView` + `.map()` — even for short lists. Virtualizers only mount visible items.

```tsx
// BAD: mounts all items at once
<ScrollView>
  {orders.map(o => <OrderCard key={o.id} order={o} />)}
</ScrollView>

// GOOD: virtualizes, only ~10-15 items mounted
import { FlashList } from '@shopify/flash-list'

<FlashList
  data={orders}
  renderItem={({ item }) => <OrderCard item={item} />}
  keyExtractor={(item) => item.id}
  estimatedItemSize={80}
/>
```

### 2.2 Avoid Inline Objects in renderItem

Inline objects create new references every render, breaking memoization.

```tsx
// BAD: new object every render
renderItem={({ item }) => (
  <OrderCard order={{ id: item.id, status: item.status }} />
)}

// BAD: inline style object
renderItem={({ item }) => (
  <OrderCard style={{ backgroundColor: item.isUrgent ? 'red' : 'gray' }} />
)}

// GOOD: pass item directly or primitives
renderItem={({ item }) => <OrderCard item={item} />}

// GOOD: hoist static styles
const urgentStyle = { backgroundColor: 'red' }
const normalStyle = { backgroundColor: 'gray' }
renderItem={({ item }) => (
  <OrderCard style={item.isUrgent ? urgentStyle : normalStyle} />
)}
```

### 2.3 Hoist Callbacks to List Root

Create callback instances once at the root, not per item.

```tsx
// BAD: new function every render
renderItem={({ item }) => {
  const onPress = () => handlePress(item.id)
  return <OrderCard item={item} onPress={onPress} />
}}

// GOOD: stable reference with useCallback
const onPress = useCallback((id: string) => handlePress(id), [handlePress])
renderItem={({ item }) => <OrderCard item={item} onPress={onPress} />}
```

### 2.4 Keep List Items Lightweight

List items should be simple render functions. No queries, no expensive computations, minimal hooks.

```tsx
// BAD: heavy item with query + context
function OrderCard({ id }: { id: string }) {
  const { data } = useQuery(['order', id], () => fetchOrder(id))
  const theme = useContext(ThemeContext)
  const user = useContext(UserContext)
  return <View>...</View>
}

// GOOD: lightweight, receives pre-fetched data as props
function OrderCard({ orderNumber, status, shopName }: Props) {
  return (
    <View>
      <Text>{orderNumber}</Text>
      <Text>{status}</Text>
    </View>
  )
}

// Parent fetches all data once via TanStack Query
function OrderList() {
  const { data: orders } = useOrders()
  return (
    <FlashList
      data={orders}
      renderItem={({ item }) => (
        <OrderCard
          orderNumber={item.orderNumber}
          status={item.status}
          shopName={item.shop.name}
        />
      )}
    />
  )
}
```

Use Zustand selectors for shared state inside items — not React Context:

```tsx
// BAD: Context re-renders all items when any cart value changes
const inCart = useContext(CartContext).items.includes(id)

// GOOD: Zustand selector re-renders only this item
const inCart = useCartStore((s) => s.items.has(id))
```

### 2.5 Stable Object References for List Data

Never `.map()` or `.filter()` data inline before passing to FlashList. New arrays each render reset virtualization.

```tsx
// BAD: creates new objects on every keystroke
const items = orders.map(o => ({ ...o, label: `${o.orderNumber} - ${o.status}` }))
<FlashList data={items} ... />

// GOOD: pass stable array, derive inside items
<FlashList data={orders} renderItem={({ item }) => <OrderCard order={item} />} />

// GOOD: creating a new array is fine if inner objects stay stable
const sorted = orders.toSorted((a, b) => a.createdAt - b.createdAt)
<FlashList data={sorted} ... />
```

### 2.6 Pass Primitives to List Items

Primitive props enable shallow comparison in `memo()`.

```tsx
// BAD: object prop, memo can't compare by value
const OrderCard = memo(({ order }: { order: Order }) => ...)
renderItem={({ item }) => <OrderCard order={item} />}

// GOOD: primitives, memo comparison works correctly
const OrderCard = memo(({ id, orderNumber, status }: Props) => ...)
renderItem={({ item }) => (
  <OrderCard id={item.id} orderNumber={item.orderNumber} status={item.status} />
)}
```

### 2.7 Use Compressed Cloudinary Images in Lists

PrintSlot stores files on Cloudinary. Always append resize params for thumbnails:

```tsx
// BAD: full resolution in list thumbnail
<Image source={{ uri: order.files[0].url }} style={{ width: 60, height: 60 }} />

// GOOD: compressed thumbnail at 2x display size
const thumbUrl = `${order.files[0].url}?w=120&h=120&c=fill&q=auto`
<Image
  source={{ uri: thumbUrl }}
  style={{ width: 60, height: 60 }}
  contentFit="cover"
  recyclingKey={order.id}
/>
```

### 2.8 Use Item Types for Heterogeneous Lists

When a list has different item layouts (orders, headers, banners), use `getItemType`.

```tsx
type OrderItem = { type: 'order'; id: string; orderNumber: string }
type HeaderItem = { type: 'header'; title: string }
type FeedItem = OrderItem | HeaderItem

<FlashList
  data={items}
  keyExtractor={(item) => item.type === 'order' ? item.id : item.title}
  getItemType={(item) => item.type}
  renderItem={({ item }) => {
    switch (item.type) {
      case 'order': return <OrderCard orderNumber={item.orderNumber} />
      case 'header': return <SectionHeader title={item.title} />
    }
  }}
  estimatedItemSize={72}
/>
```

---

## 3. Animation

**Impact: HIGH**

### 3.1 Animate Transform and Opacity Only

Never animate `width`, `height`, `top`, `left`, `margin`, `padding` — they trigger layout every frame. Use `transform` and `opacity` (GPU-accelerated).

```tsx
// BAD: layout property, triggers recalculation every frame
useAnimatedStyle(() => ({ height: withTiming(expanded ? 200 : 0) }))

// GOOD: GPU-accelerated
useAnimatedStyle(() => ({
  transform: [{ scaleY: withTiming(expanded ? 1 : 0) }],
  opacity: withTiming(expanded ? 1 : 0),
}))

// GOOD: slide animation
useAnimatedStyle(() => ({
  transform: [{ translateY: withTiming(visible ? 0 : 100) }],
  opacity: withTiming(visible ? 1 : 0),
}))
```

### 3.2 Prefer useDerivedValue Over useAnimatedReaction

`useDerivedValue` is for computing values. `useAnimatedReaction` is for side effects only.

```tsx
// BAD: derivation using reaction
useAnimatedReaction(
  () => progress.value,
  (current) => { opacity.value = 1 - current }
)

// GOOD: declarative derivation
const opacity = useDerivedValue(() => 1 - progress.get())
```

### 3.3 GestureDetector for Press Animations

Use `Gesture.Tap()` for animated press states — not Pressable's `onPressIn`/`onPressOut`. Gesture callbacks run on the UI thread.

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, runOnJS } from 'react-native-reanimated'

function AnimatedButton({ onPress }: { onPress: () => void }) {
  const pressed = useSharedValue(0) // ground truth: 0=not pressed, 1=pressed

  const tap = Gesture.Tap()
    .onBegin(() => { pressed.set(withTiming(1)) })
    .onFinalize(() => { pressed.set(withTiming(0)) })
    .onEnd(() => { runOnJS(onPress)() })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
  }))

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={animatedStyle}>
        <Text>Press me</Text>
      </Animated.View>
    </GestureDetector>
  )
}
```

---

## 4. Scroll Performance

**Impact: HIGH**

### 4.1 Never Track Scroll Position in useState

Scroll events fire at 60fps. `setState` causes render thrashing and jank.

```tsx
// BAD: re-renders every frame
const [scrollY, setScrollY] = useState(0)
onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}

// GOOD: Reanimated shared value (UI thread, no re-render)
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated'
const scrollY = useSharedValue(0)
const onScroll = useAnimatedScrollHandler({
  onScroll: (e) => { scrollY.value = e.contentOffset.y },
})
return <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} />

// GOOD: ref for non-reactive tracking (e.g. "scroll to top" check)
const scrollY = useRef(0)
onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y }}
```

---

## 5. Navigation

**Impact: HIGH**

### 5.1 Use Native Navigators (Expo Router already does this)

PrintSlot uses Expo Router which defaults to the native stack. Always use it correctly:

```tsx
// GOOD: expo-router router API
import { router } from 'expo-router'
router.push('/(customer)/orders/new')
router.replace('/(auth)/login')

// BAD: never use this in PrintSlot
useNavigation()  // ❌

// GOOD: native stack options instead of custom header component
<Stack.Screen
  name="order-detail"
  options={{
    title: 'Order Details',
    headerLargeTitleEnabled: true,  // iOS large title
  }}
/>

// BAD: JS header component
<Stack.Screen options={{ header: () => <MyCustomHeader /> }} />
```

For tabs, use native tabs via expo-router's native tabs API — not `@react-navigation/bottom-tabs` JS implementation.

---

## 6. React State

**Impact: MEDIUM**

### 6.1 Minimize State — Derive Values

```tsx
// BAD: redundant state
const [total, setTotal] = useState(0)
useEffect(() => setTotal(items.reduce((s, i) => s + i.price, 0)), [items])

// GOOD: derive during render
const total = items.reduce((s, i) => s + i.price, 0)
```

### 6.2 Use Fallback State (undefined + ??)

`undefined` means "user hasn't chosen yet". Fall back to server/parent value reactively.

```tsx
// BAD: initialState freezes value at mount
const [enabled, setEnabled] = useState(serverEnabled)

// GOOD: reactive fallback
const [_enabled, setEnabled] = useState<boolean | undefined>(undefined)
const enabled = _enabled ?? serverEnabled  // updates when serverEnabled changes
```

### 6.3 Dispatch Updater When Next State Depends on Current

```tsx
// BAD: stale closure
const onPress = () => setCount(count + 1)

// GOOD: always fresh
const onPress = () => setCount(prev => prev + 1)

// GOOD: skip re-render if value unchanged (for objects)
setSize(prev => {
  if (prev?.width === width && prev?.height === height) return prev
  return { width, height }
})
```

---

## 7. State Architecture

**Impact: MEDIUM**

### 7.1 State Must Represent Ground Truth

State variables should represent real state (what's happening), not derived visual values.

```tsx
// BAD: storing visual output
const scale = useSharedValue(1)
tap.onBegin(() => { scale.set(withTiming(0.95)) })

// GOOD: store state, derive visuals
const pressed = useSharedValue(0)
tap.onBegin(() => { pressed.set(withTiming(1)) })
const style = useAnimatedStyle(() => ({
  transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
}))

// Same principle for React state
const [isExpanded, setIsExpanded] = useState(false)
const height = isExpanded ? 200 : 0  // derived, not stored
```

---

## 8. React Compiler

**Impact: MEDIUM**

### 8.1 Destructure Functions Early

```tsx
// BAD: dotting into objects — compiler keys on unstable objects
const router = useRouter()
const handlePress = () => router.push('/success')

// GOOD: destructure — stable references
const { push } = useRouter()
const { onSave } = props
const handlePress = () => { onSave(); push('/success') }
```

### 8.2 Use .get() and .set() for Reanimated Shared Values

```tsx
// BAD: .value breaks with React Compiler
count.value = count.value + 1

// GOOD: React Compiler compatible
count.set(count.get() + 1)
```

---

## 9. User Interface

**Impact: MEDIUM**

### 9.1 Measure Views with onLayout + useLayoutEffect

```tsx
function MeasuredBox({ children }: { children: React.ReactNode }) {
  const ref = useRef<View>(null)
  const [size, setSize] = useState<{ width: number; height: number } | undefined>()

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setSize({ width: rect.width, height: rect.height })
  }, [])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize(prev => {
      if (prev?.width === width && prev?.height === height) return prev
      return { width, height }
    })
  }

  return <View ref={ref} onLayout={onLayout}>{children}</View>
}
```

### 9.2 Styling Rules

```tsx
// Use gap for spacing between children (not margin on children)
<View style={{ gap: 8 }}>
  <Text>First</Text>
  <Text>Second</Text>
</View>

// Use borderCurve: 'continuous' with all borderRadius
style={{ borderRadius: 12, borderCurve: 'continuous' }}

// Use boxShadow CSS string (not legacy shadow props)
style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}

// Use experimental_backgroundImage for gradients
style={{ experimental_backgroundImage: 'linear-gradient(to bottom, #000, #fff)' }}

// Avoid varying font sizes — use fontWeight and color for hierarchy
<Text style={{ fontWeight: '600' }}>Title</Text>
<Text style={{ color: '#666' }}>Subtitle</Text>
<Text style={{ color: '#999' }}>Caption</Text>
```

### 9.3 contentInset for Dynamic Scroll Spacing

Use `contentInset` (not `paddingBottom`) for dynamic bottom spacing — doesn't trigger layout recalculation.

```tsx
// BAD: triggers full layout recalculation when bottomOffset changes
<ScrollView contentContainerStyle={{ paddingBottom: bottomOffset }}>

// GOOD: adjusts scroll bounds only
<ScrollView
  contentInset={{ bottom: bottomOffset }}
  scrollIndicatorInsets={{ bottom: bottomOffset }}
>
```

### 9.4 Safe Areas with contentInsetAdjustmentBehavior

```tsx
// BAD: manual SafeAreaView wrapper
<SafeAreaView style={{ flex: 1 }}>
  <ScrollView>...</ScrollView>
</SafeAreaView>

// GOOD: native iOS handling, works with translucent nav bars
<ScrollView contentInsetAdjustmentBehavior="automatic">
  ...
</ScrollView>
```

### 9.5 expo-image for All Images

```tsx
// BAD: RN Image
import { Image } from 'react-native'

// GOOD: expo-image
import { Image } from 'expo-image'

// With blurhash placeholder and caching
<Image
  source={{ uri: url }}
  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
  contentFit="cover"
  cachePolicy="memory-disk"
  transition={200}
  recyclingKey={item.id}
  style={styles.image}
/>
```

For Cloudinary PrintSlot images in lists, always append `?w=120&h=120&c=fill&q=auto` for thumbnails.

### 9.6 Native Modals Over JS Bottom Sheets

```tsx
// BAD: third-party JS bottom sheet library
import BottomSheet from 'some-js-bottom-sheet'

// GOOD: native modal
<Modal visible={visible} presentationStyle="formSheet" animationType="slide" onRequestClose={close}>
  <View>...</View>
</Modal>

// GOOD: React Navigation v7 native form sheet (used in Expo Router)
<Stack.Screen name="order-confirm" options={{ presentation: 'formSheet' }} />
```

### 9.7 Native Menus with Zeego

```tsx
import * as DropdownMenu from 'zeego/dropdown-menu'
import * as ContextMenu from 'zeego/context-menu'

// Dropdown
<DropdownMenu.Root>
  <DropdownMenu.Trigger><Pressable><Text>Options</Text></Pressable></DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item key="cancel" destructive onSelect={handleCancel}>
      <DropdownMenu.ItemTitle>Cancel Order</DropdownMenu.ItemTitle>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

// Context menu (long-press)
<ContextMenu.Root>
  <ContextMenu.Trigger><OrderCard /></ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item key="view" onSelect={handleView}>
      <ContextMenu.ItemTitle>View Details</ContextMenu.ItemTitle>
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
```

### 9.8 Pressable — Not TouchableOpacity

```tsx
// BAD: legacy
import { TouchableOpacity } from 'react-native'
<TouchableOpacity onPress={onPress} activeOpacity={0.7}>...</TouchableOpacity>

// GOOD
import { Pressable } from 'react-native'
<Pressable onPress={onPress}>...</Pressable>

// GOOD: inside FlashList, use gesture-handler Pressable
import { Pressable } from 'react-native-gesture-handler'
```

---

## 10. Design System

**Impact: MEDIUM**

### 10.1 Compound Components

Don't create components with polymorphic string children. Use compound components.

```tsx
// BAD: polymorphic
<Button>Save</Button>        // string
<Button><Icon /></Button>    // ReactNode — same component, different behavior

// GOOD: compound
<Button>
  <ButtonIcon><CheckIcon /></ButtonIcon>
  <ButtonText>Save</ButtonText>
</Button>
```

---

## 11. Monorepo

**Impact: LOW (but CRITICAL to get right)**

### 11.1 Native Dependencies in apps/mobile

All packages with native code MUST be listed in `apps/mobile/package.json` for autolinking. Having them only in `packages/shared` means autolinking won't find them.

```json
// apps/mobile/package.json — native deps MUST be here
{
  "dependencies": {
    "react-native-reanimated": "3.16.1",
    "react-native-gesture-handler": "2.20.2",
    "expo-image": "~2.0.4"
  }
}
```

### 11.2 Single Exact Versions Across All Packages

Pin exact versions — no `^` or `~`. Use `npm overrides` at root to enforce.

```json
// package.json (root)
{
  "overrides": {
    "react-native-reanimated": "3.16.1"
  }
}
```

---

## 12. Third-Party Dependencies

**Impact: LOW**

### 12.1 Import from Design System Folder

App code imports from `@/components/` — not directly from `react-native` or third-party packages. This enables swapping implementations without touching feature code.

```tsx
// BAD
import { View, Text } from 'react-native'
import { Image } from 'expo-image'

// GOOD
import { View } from '@/components/view'
import { Text } from '@/components/text'
import { Image } from '@/components/image'  // re-exports expo-image with defaults
```

---

## 13. JavaScript

**Impact: LOW**

### 13.1 Hoist Intl Formatters

Creating `Intl` objects is expensive — they parse locale data. Hoist to module scope.

```tsx
// BAD: new formatter every render
function Price({ amount }: { amount: number }) {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' })
  return <Text>{fmt.format(amount)}</Text>
}

// GOOD: created once
const bdtFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' })
function Price({ amount }: { amount: number }) {
  return <Text>{bdtFormatter.format(amount)}</Text>
}
```

---

## 14. Fonts

**Impact: LOW**

### 14.1 Load Fonts via Config Plugin (Not useFonts)

```tsx
// BAD: async loading causes flash, loading state
const [fontsLoaded] = useFonts({ 'Inter-Bold': require('./assets/Inter-Bold.ttf') })
if (!fontsLoaded) return null

// GOOD: add to app.json plugins, fonts embedded at build time
// app.json
{
  "plugins": [
    ["expo-font", { "fonts": ["./assets/fonts/Inter-Bold.ttf"] }]
  ]
}
// No loading state needed in component
<Text style={{ fontFamily: 'Inter-Bold' }}>Hello</Text>
```

After adding: `npx expo prebuild` then rebuild the app.

---

## 15. PrintSlot-Specific Rules

These rules are specific to the PrintSlot mobile app (`apps/mobile`) and override or extend the generic rules above.

### 15.1 Data Fetching — TanStack Query Is the Cache

Never manually sync server data into Zustand. TanStack Query IS the cache.

```tsx
// BAD: server data in Zustand
const { data: orders } = useOrders()
useEffect(() => { useOrderStore.setState({ orders }) }, [orders])

// GOOD: read directly from query
const { data: orders, isLoading } = useOrders()

// GOOD: invalidate on mutation success
const createOrder = useMutation({
  mutationFn: ordersApi.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
})
```

### 15.2 Zustand — UI State Only

Zustand stores hold only UI/interaction state. Never server state.

```
useOrderWizardStore  → print config wizard steps (files selected, color mode, copies)
useAuthStore         → Supabase session, user object, role
useSettingsStore     → language preference, connectivity flag
```

### 15.3 Navigation — Always Expo Router

```tsx
import { router } from 'expo-router'

router.push('/(customer)/orders/new')     // ✅
router.replace('/(auth)/login')            // ✅
router.push(`/(customer)/orders/${id}`)   // ✅

useNavigation()                            // ❌ never
```

### 15.4 Role Guards at Layout Level

Role-based access is enforced in route group `_layout.tsx` files — not inside screens.

```tsx
// ✅ enforce in (customer)/_layout.tsx
const { role } = useAuthStore()
if (role !== Role.CUSTOMER) router.replace('/(auth)/login')

// ❌ never check role inside a screen component
function OrdersScreen() {
  const { role } = useAuthStore()
  if (role !== 'CUSTOMER') return <Redirect to="/login" />  // wrong place
}
```

### 15.5 Order Images — Cloudinary URL Patterns

```tsx
// List thumbnail (60x60 display, 120x120 request for retina)
const thumbUrl = `${file.url}?w=120&h=120&c=fill&q=auto&f=auto`

// Order detail view (full width)
const detailUrl = `${file.url}?w=800&q=auto&f=auto`

// Always use expo-image with recyclingKey in lists
<Image
  source={{ uri: thumbUrl }}
  style={{ width: 60, height: 60 }}
  contentFit="cover"
  cachePolicy="memory-disk"
  recyclingKey={file.id}
/>
```

### 15.6 Real-Time — WebSocket + Poll Fallback

```tsx
// On order detail screen mount:
// 1. Join WebSocket room
socket.emit('order:join', { orderId })
socket.on('order:status_changed', (data) => {
  queryClient.invalidateQueries({ queryKey: ['orders', data.orderId] })
})

// 2. TanStack Query polls as fallback (not as primary)
const { data: order } = useQuery({
  queryKey: ['orders', orderId],
  queryFn: () => ordersApi.getById(orderId),
  refetchInterval: 30_000,  // 30s fallback only
})

// ❌ never poll in useEffect with setInterval
```

### 15.7 Order Numbers vs UUIDs

```tsx
// Display to users: orderNumber (PS-XXXXX format)
<Text>Order {order.orderNumber}</Text>  // ✅

// API routes: id (UUID)
router.push(`/(customer)/orders/${order.id}`)  // ✅

// ❌ never show UUID to end users
<Text>Order {order.id}</Text>  // ❌
```

### 15.8 Wallet — No Balance Column

```tsx
// ❌ this field does not exist
order.wallet.balance

// ✅ balance is returned by API as computed field
const { data: wallet } = useWallet()
wallet.balance  // computed by API: SUM(CREDIT) - SUM(DEBIT)
```

### 15.9 Optimistic Lock on Status Updates

When updating order status, always include `expectedCurrentStatus`:

```tsx
await ordersApi.updateStatus({
  orderId: order.id,
  status: OrderStatus.READY,
  expectedCurrentStatus: order.status,  // required — server rejects if stale
})
// Handle 409: show conflict error, refetch order, let staff retry
```

---

## Quick Reference Checklist

Before shipping any mobile feature, verify:

- [ ] No `{value && <X />}` where value could be `0` or `""`
- [ ] All strings inside `<Text>`
- [ ] All lists use `FlashList` — no `ScrollView` + `.map()`
- [ ] No scroll position in `useState`
- [ ] Animations only use `transform` + `opacity`
- [ ] All images use `expo-image` with Cloudinary resize params in lists
- [ ] No queries or context reads inside list item components
- [ ] `router.push/replace` from `expo-router` — not `useNavigation()`
- [ ] Role checks in `_layout.tsx` — not inside screens
- [ ] No `TouchableOpacity` — use `Pressable`
- [ ] Native modals — not JS bottom sheet libraries
- [ ] TanStack Query is the server cache — no server data in Zustand
- [ ] `orderNumber` shown to users, `id` (UUID) used in API calls

---

## References

- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [Expo Router](https://docs.expo.dev/router/introduction)
- [Reanimated](https://docs.swmansion.com/react-native-reanimated)
- [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler)
- [FlashList](https://shopify.github.io/flash-list)
- [expo-image](https://docs.expo.dev/versions/latest/sdk/image)
- [zeego (native menus)](https://zeego.dev)
- [Galeria (image lightbox)](https://github.com/nandorojo/galeria)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://zustand-demo.pmnd.rs)
