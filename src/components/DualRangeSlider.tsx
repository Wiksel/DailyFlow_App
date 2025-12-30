import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, PanResponder, GestureResponderEvent, PanResponderGestureState, Animated } from 'react-native';

interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  values: [number, number];
  onChange: (min: number, max: number) => void;
  onLiveChange?: (min: number, max: number) => void;
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
  width?: number;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  step = 1,
  values,
  onChange,
  onLiveChange,
  trackColor = '#ddd',
  fillColor = '#3b82f6',
  thumbColor = '#3b82f6',
  width,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [localMin, setLocalMin] = useState(values[0]);
  const [localMax, setLocalMax] = useState(values[1]);
  const dragging = useRef<null | 'min' | 'max'>(null);
  const localMinRef = useRef(localMin);
  const localMaxRef = useRef(localMax);
  const prevPxRef = useRef<{ min: number; max: number }>({ min: 0, max: 0 });
  const dragStartRef = useRef<{
    handle: null | 'min' | 'max';
    offsetPx: number;
  }>({ handle: null, offsetPx: 0 });
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;
  

  // Aktualizuj z zewnątrz tylko gdy NIE przeciągamy, żeby uniknąć „walki” ze stanem rodzica
  useEffect(() => {
    if (dragging.current) return;
    setLocalMin(values[0]);
    setLocalMax(values[1]);
  }, [values[0], values[1]]);
  useEffect(() => { localMinRef.current = localMin; }, [localMin]);
  useEffect(() => { localMaxRef.current = localMax; }, [localMax]);

  const onLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const w = useMemo(() => {
    const effective = typeof width === 'number' && width > 0 ? width : containerWidth;
    return Math.max(1, effective);
  }, [width, containerWidth]);

  const clamp = (val: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, val));

  const valueToX = useCallback((v: number) => {
    const ratio = (v - min) / (max - min);
    return clamp(ratio * w, 0, w);
  }, [min, max, w]);

  const xToRawValue = useCallback((x: number) => {
    const clampedX = clamp(x, 0, w);
    const ratio = w <= 0 ? 0 : clampedX / w;
    const raw = min + ratio * (max - min);
    return clamp(raw, min, max);
  }, [min, max, w]);

  const quantize = useCallback((val: number) => {
    const stepsFromMin = Math.round((val - min) / step);
    const stepped = min + stepsFromMin * step;
    return clamp(stepped, min, max);
  }, [min, max, step]);

  // Precompute initial positions (not used directly in render after Animated was added)
  const leftPx = valueToX(Math.min(localMin, localMax));
  const rightPx = valueToX(Math.max(localMin, localMax));

  // Sync animated positions with current values or width
  useEffect(() => {
    const lp = valueToX(Math.min(localMinRef.current, localMaxRef.current));
    const rp = valueToX(Math.max(localMinRef.current, localMaxRef.current));
    leftAnim.setValue(lp);
    rightAnim.setValue(rp);
  }, [w]);
  useEffect(() => {
    const lp = valueToX(Math.min(localMin, localMax));
    const rp = valueToX(Math.max(localMin, localMax));
    leftAnim.setValue(lp);
    rightAnim.setValue(rp);
  }, [localMin, localMax, valueToX]);

  // Wywołuj onLiveChange z zaokrąglonymi do całych wartościami (płynna interpolacja -> zaokrąglenie),
  // tylko gdy wynik się zmieni – bez przeciążania rodzica i bez doskakiwania paska
  const roundForDisplay = useCallback((v: number) => {
    const edgeThreshold = 0.1; // delikatniejszy próg przy krawędziach
    if (v <= min + edgeThreshold) return min;
    if (v >= max - edgeThreshold) return max;
    return Math.round(v);
  }, [min, max]);

  const lastLiveRef = useRef<{ min: number; max: number }>({ min: Math.round(values[0]), max: Math.round(values[1]) });
  const emitLive = (mn: number, mx: number) => {
    if (!onLiveChange) return;
    const liveMin = Math.max(min, Math.min(max, roundForDisplay(mn)));
    const liveMax = Math.max(min, Math.min(max, roundForDisplay(mx)));
    if (liveMin !== lastLiveRef.current.min || liveMax !== lastLiveRef.current.max) {
      lastLiveRef.current = { min: liveMin, max: liveMax };
      onLiveChange(liveMin, liveMax);
    }
  };

  // Bardzo mały próg do odfiltrowania mikro-drgań dotyku
  const DEADZONE_PX = 0;
  // Minimalny margines przy mijaniu drugiego kciuka, aby uniknąć ping-ponga na granicy
  const CROSS_EPS = 0.25;

  const containerPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const x = evt.nativeEvent.locationX;
      const lp = valueToX(localMinRef.current);
      const rp = valueToX(localMaxRef.current);
      const dL = Math.abs(x - lp);
      const dR = Math.abs(x - rp);
      const handle: 'min' | 'max' = dL === dR ? (x >= lp ? 'max' : 'min') : (dL < dR ? 'min' : 'max');
      dragging.current = handle;
      const startPx = handle === 'min' ? lp : rp;
      const offsetPx = startPx - x;
      dragStartRef.current = { handle, offsetPx };
      prevPxRef.current[handle] = x + offsetPx;
      // no-op
    },
    onPanResponderMove: (evt: GestureResponderEvent, _gesture: PanResponderGestureState) => {
      const handle = dragging.current;
      if (!handle) return;
      const x = evt.nativeEvent.locationX;
      const adjusted = x + (dragStartRef.current.handle ? dragStartRef.current.offsetPx : 0);
      const clampedPx = clamp(adjusted, 0, w);
      // Proste zakotwiczenie offsetu dokładnie na krawędziach
      if (handle === 'min' && clampedPx <= 0) {
        leftAnim.setValue(0);
        localMinRef.current = min;
        emitLive(localMinRef.current, localMaxRef.current);
        dragStartRef.current = { handle: 'min', offsetPx: 0 - x };
        prevPxRef.current.min = 0;
        return;
      }
      if (handle === 'max' && clampedPx >= w) {
        rightAnim.setValue(w);
        localMaxRef.current = max;
        emitLive(localMinRef.current, localMaxRef.current);
        dragStartRef.current = { handle: 'max', offsetPx: w - x };
        prevPxRef.current.max = w;
        return;
      }
      if (Math.abs(clampedPx - prevPxRef.current[handle]) < DEADZONE_PX) return;
      prevPxRef.current[handle] = clampedPx;
      if (handle === 'min') {
        const otherPx = valueToX(localMaxRef.current);
        if (clampedPx > otherPx + CROSS_EPS) {
          // Płynne przełączenie na 'max' bez skoku i z nowym zakotwiczeniem offsetu
          localMinRef.current = localMaxRef.current;
          leftAnim.setValue(otherPx);
          dragging.current = 'max';
          dragStartRef.current = { handle: 'max', offsetPx: otherPx - x };
          prevPxRef.current.max = otherPx;
          return;
        }
        leftAnim.setValue(clampedPx);
        const raw = xToRawValue(clampedPx);
        localMinRef.current = clamp(raw, min, localMaxRef.current);
        emitLive(localMinRef.current, localMaxRef.current);
      } else {
        const otherPx = valueToX(localMinRef.current);
        if (clampedPx < otherPx - CROSS_EPS) {
          localMaxRef.current = localMinRef.current;
          rightAnim.setValue(otherPx);
          dragging.current = 'min';
          dragStartRef.current = { handle: 'min', offsetPx: otherPx - x };
          prevPxRef.current.min = otherPx;
          return;
        }
        rightAnim.setValue(clampedPx);
        const raw = xToRawValue(clampedPx);
        localMaxRef.current = clamp(raw, localMinRef.current, max);
        emitLive(localMinRef.current, localMaxRef.current);
      }
    },
    onPanResponderRelease: () => {
      dragging.current = null;
      dragStartRef.current = { handle: null, offsetPx: 0 };
      const qMin = quantize(localMinRef.current);
      const qMax = quantize(localMaxRef.current);
      localMinRef.current = qMin;
      localMaxRef.current = qMax;
      setLocalMin(qMin);
      setLocalMax(qMax);
      leftAnim.setValue(valueToX(qMin));
      rightAnim.setValue(valueToX(qMax));
      onChange(qMin, qMax);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => { dragging.current = null; dragStartRef.current = { handle: null, offsetPx: 0 }; },
  }), [valueToX, xToRawValue, quantize, onChange, min, max, w]);

  return (
    <View style={[styles.container, { width: width ?? '100%' }]} onLayout={onLayout} {...containerPan.panHandlers}>
      <View style={[styles.track, { backgroundColor: trackColor }]} />
      <Animated.View style={[styles.fill, { backgroundColor: fillColor, left: leftAnim, width: Animated.subtract(rightAnim, leftAnim) }]} />
      {/* Thumbs */}
      <Animated.View style={[styles.thumb, { left: Animated.subtract(leftAnim, 8), backgroundColor: thumbColor }]} pointerEvents="none" />
      <Animated.View style={[styles.thumb, { left: Animated.subtract(rightAnim, 8), backgroundColor: thumbColor }]} pointerEvents="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 22, justifyContent: 'center', alignSelf: 'stretch' },
  track: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 1.5 },
  fill: { position: 'absolute', height: 3, borderRadius: 1.5 },
  thumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
});

export default DualRangeSlider;


