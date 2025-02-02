import React from 'react';
import { View, StyleSheet, Dimensions  } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';

// sample video
const videoSource = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
// for testing a local download
// const videoSource = require('../../assets/ForBifferBlazes.mp4');

export default function App() {
  // Initialize video player.
  const player = useVideoPlayer(videoSource, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.play();
  });

  // When the gesture starts, store the current time.
  const initialTimeRef = useSharedValue(0);
  // Used to throttle JS calls
  const lastUpdateTime = useSharedValue(0);
  // windows width used to translate swipe into a time delta for seeking the video
  const { width: screenWidth } = Dimensions.get('window');

  // JS function to save initial video time when a swiping gesture starts
  const saveInitialTime = () => {
    player.pause();
    initialTimeRef.value = player.currentTime;
  }
  // JS function to seek the video by a given time delta
  const seekTimeDelta = (delta) => {
    let newTime = initialTimeRef.value + delta;
    newTime = Math.max(0, Math.min(newTime, player.duration));
    player.currentTime = newTime;
    console.log("Seeking to: ", newTime);
  };
  // JS function to toggle video playing status
  const togglePlaying = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  // Tap detector for playing/pausing video
  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(togglePlaying)();
  })
  // Pan gesture that continuously seeks the video
  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(saveInitialTime)();
    })
    .onUpdate((event) => {
      // Throttle JS video seek updates to 40fps
      const fps = 20.0
      let currentTime = Date.now();
      if (currentTime - lastUpdateTime.value < 1000.0/fps) {
        return;
      }
      lastUpdateTime.value = currentTime;
      // Map horizontal translation to a time offset (a full-screen drag equals a 10s duration).
      const seekDelta = (event.translationX / screenWidth) * 10.0;
      runOnJS(seekTimeDelta)(seekDelta);
     
    });

  return (
    <View style={styles.container}>
      <VideoView style={styles.video} player={player} nativeControls={false} />
      {/* Add an invisible overlay for Android */}
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, tapGesture)}>
        <View style={styles.touchOverlay} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
});