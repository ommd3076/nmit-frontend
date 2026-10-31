import React from 'react';
import { Pressable, View, Text } from 'react-native';
import type { DriverStop } from '../api/client';
import { projectRouteMapPoints } from './routeProjection';
declare const require: (id:string)=>any;
type Props={geojson:unknown;stops:DriverStop[];selectedStopId?:string;onSelectStop?:(stop:DriverStop)=>void};
export function DriverRouteMap(props:Props){
 if(process.env.EXPO_PUBLIC_NATIVE_MAPS === '1') { const NativeMap=require('./DriverRouteMap.development').DriverRouteMap; return <NativeMap {...props}/>; }
 const stops=props.stops.filter(s=>s.coordinates && s.coordinates.every(Number.isFinite));
 const coords=stops.map(s=>s.coordinates!);
 const points=projectRouteMapPoints(coords,300,180);
 return <View style={{backgroundColor:'#edf1ed',borderRadius:14,padding:14}}>
  <Text style={{color:'#17392e',fontWeight:'700'}}>Planned stops</Text>
  <View style={{height:180,position:'relative'}}>{stops.map((s,i)=><Pressable key={s.id} accessibilityRole="button" accessibilityLabel={'Select stop '+s.sequence} onPress={()=>props.onSelectStop?.(s)} style={{position:'absolute',left:Math.min(points[i].x,270),top:Math.min(points[i].y,150),width:28,height:28,borderRadius:14,backgroundColor:props.selectedStopId===s.id?'#e7a939':'#27845f',alignItems:'center',justifyContent:'center'}}><Text style={{color:'white'}}>{s.sequence}</Text></Pressable>)}</View>
  <Text style={{color:'#435248',fontSize:11}}>Expo Go coordinate view. Interactive basemap requires a development build. No live GPS.</Text>
 </View>;
}
