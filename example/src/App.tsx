import * as React from "react";

import {
  StyleSheet,
  View,
  Text,
  Button,
  SafeAreaView,
  Alert,
} from "react-native";

import { PID } from "@pagopa/io-react-native-wallet";

const pidToken =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0cnVzdF9jaGFpbiI6W10sInR5cCI6InZjK3NkLWp3dCJ9.eyJzdWIiOiJMeExqRXJNUkd5cTRmb0ZCODh1TUxiVFQ2cS1rUHNITDhNTGktYloyUWRVIiwidmVyaWZpZWRfY2xhaW1zIjp7ImNsYWltcyI6eyJfc2QiOlsiMnFwTS1SQ2hlR3ZaQUw1cHJDaHJaemtCa0VmQXNGREw4QXRZcVlrZ3UwayIsIjVBYko5WVNFNHpNb0NNRnplbjExNXZBa2ZKMkpzbmoxUnVYNVlvRmRTM0kiLCJJOWVLZHp2TmhBZ3VXekZ0WE8yZmJVQ1pVYWhQOXBmRVpVclpqaGV0YURjIiwiVkNXU2ljbDhxZzJQRzE3RVNIU3c1UEx0QUJ2V1hPLWhqRHVNRG4wTkpONCIsIlo3cWNrVGdSNzRaMzZMWG1oMFc4VXRaRWRrQm1rWnNSNUJPNFN6dzdnNjgiLCJvOThVZHlfdGlZb2c1SVhVYmw1aDJyQ0h4S2J5Y1NXNEQ0OFJ6NldyZXo0Il19LCJ2ZXJpZmljYXRpb24iOnsidHJ1c3RfZnJhbWV3b3JrIjoiZWlkYXMiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIiwiX3NkIjpbImVneGtET19CSUFOVXI5V1k0Wl9XQlhBNzNONmNiOXVUTWcwWmVPcXBrSTAiXX19LCJfc2RfYWxnIjoic2hhLTI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJrdHkiOiJFQyIsIngiOiJxckpyajNBZl9CNTdzYk9JUnJjQk03YnI3d09jOHluajdsSEZQVGVmZlVrIiwieSI6IjFIMGNXRHlHZ3ZVOHcta1BLVV94eWNPQ1VOVDJvMGJ3c2xJUXRuUFU2aU0iLCJraWQiOiI1dDVZWXBCaE4tRWdJRUVJNWlVenI2cjBNUjAyTG5WUTBPbWVrbU5LY2pZIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwianRpIjoidXJuOnV1aWQ6YTQ0MmEzNDAtYjM4ZS00OWMzLTlkNDktZjc1OWY0MDgzMWU2Iiwic3RhdHVzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3N0YXR1cyIsImlhdCI6MTY4OTY3MTg1OCwiZXhwIjoyMDA1MjQ3ODU4fQ.K13CInC5J0SlrFNYKEL2znK5dfUDemR8Gd5kUfCQUkk34fERIi5W-Rk4DJiqnN_sny21TBraTjnDE_nDlA9Q3w~WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImV2aWRlbmNlIiwgW3sidHlwZSI6ICJlbGVjdHJvbmljX3JlY29yZCIsICJyZWNvcmQiOiB7InR5cGUiOiAiZWlkYXMuaXQuY2llIiwgInNvdXJjZSI6IHsib3JnYW5pemF0aW9uX25hbWUiOiAiTWluaXN0ZXJvIGRlbGwnSW50ZXJubyIsICJvcmdhbml6YXRpb25faWQiOiAibV9pdCIsICJjb3VudHJ5X2NvZGUiOiAiSVQifX19XV0~WyJlbHVWNU9nM2dTTklJOEVZbnN4QV9BIiwgInVuaXF1ZV9pZCIsICJ4eHh4eHh4eC14eHh4LXh4eHgteHh4eC14eHh4eHh4eHh4eHgiXQ~WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImdpdmVuX25hbWUiLCAiTWFyaW8iXQ~WyJlSThaV205UW5LUHBOUGVOZW5IZGhRIiwgImZhbWlseV9uYW1lIiwgIlJvc3NpIl0~WyJRZ19PNjR6cUF4ZTQxMmExMDhpcm9BIiwgImJpcnRoZGF0ZSIsICIxOTgwLTAxLTEwIl0~WyJBSngtMDk1VlBycFR0TjRRTU9xUk9BIiwgInBsYWNlX29mX2JpcnRoIiwgeyJjb3VudHJ5IjogIklUIiwgImxvY2FsaXR5IjogIlJvbWUifV0~WyJQYzMzSk0yTGNoY1VfbEhnZ3ZfdWZRIiwgInRheF9pZF9jb2RlIiwgIlRJTklULVhYWFhYWFhYWFhYWFhYWFgiXQ";

export default function App() {
  const [result, setResult] = React.useState<string | undefined>();

  React.useEffect(() => {
    setResult("READY");
  }, []);

  const decodePid = () => {
    try {
      const pidWithToken = PID.SdJwt.decode(pidToken);
      setResult(JSON.stringify(pidWithToken.pid.claims));
    } catch (e) {
      showError(e);
    }
  };

  const verifyPid = async () => {
    try {
      const pidWithToken = await PID.SdJwt.verify(pidToken);
      setResult(
        "✅ Verification OK!\n" + JSON.stringify(pidWithToken.pid.claims)
      );
    } catch (e) {
      showError(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Button title="Decode PID" onPress={decodePid} />
        <Button title="Verify PID" onPress={verifyPid} />
      </View>
      <View>
        <Text style={styles.title}>{result}</Text>
      </View>
    </SafeAreaView>
  );
}

const showError = (e: any) => {
  Alert.alert("Error!", JSON.stringify(e), [{ text: "OK" }]);
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 16,
  },
  title: {
    textAlign: "center",
    marginVertical: 8,
  },
  fixToText: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  separator: {
    marginVertical: 8,
    borderBottomColor: "#737373",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
