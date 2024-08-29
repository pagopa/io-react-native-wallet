import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { selectIoAuthToken } from "../store/reducers/sesssion";
import { useSelector } from "react-redux";
import HomeScreen from "../screens/HomeScreen";
import IdpSelectionScreen from "../screens/login/IdpSelectionScreen";
import IdpLoginScreen from "../screens/login/IdpLoginScreen";

/**
 * MainStackNav parameters list for each defined screen.
 */
export type MainStackNavParamList = {
  Home: undefined;
  Login: undefined;
  IdpSelection: undefined;
  IdpLogin: { idp: string };
};

const Stack = createNativeStackNavigator<MainStackNavParamList>();

export const MainStackNavigator = () => {
  const ioAuthToken = useSelector(selectIoAuthToken);
  return (
    <Stack.Navigator id="MainStackNavigator">
      {ioAuthToken ? (
        /*
         * Protected routes via the ioAuthToken
         */
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="IdpSelection" component={IdpSelectionScreen} />
          <Stack.Screen name="IdpLogin" component={IdpLoginScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};
