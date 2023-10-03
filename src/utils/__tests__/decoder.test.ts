import { getJwtFromFormPost } from "../decoder";
import { ValidationFailed } from "../errors";

const fakeFormPost = `<html>
 <head><title>Submit This Form</title></head>
 <body onload="javascript:document.forms[0].submit()">
  <form method="post" action="https://client.example.com/cb">
    <input type="hidden" name="response"
     value="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2
      FjY291bnRzLmV4YW1wbGUuY29tIiwiYXVkIjoiczZCaGRSa3F0MyIsImV4cCI6MTM
      xMTI4MTk3MCwiYWNjZXNzX3Rva2VuIjoiMllvdG5GWkZFanIxekNzaWNNV3BBQSIs
      InN0YXRlIjoiUzhOSjd1cWs1Zlk0RWpOdlBfR19GdHlKdTZwVXN2SDlqc1luaTlkT
      UFKdyIsInRva2VuX3R5cGUiOiJiZWFyZXIiLCJleHBpcmVzX2luIjoiMzYwMCIsIn
      Njb3BlIjoiZXhhbXBsZSJ9.bgHLOu2dlDjtCnvTLK7hTN_JNwoZXEBnbXQx5vd9z1
      7v1HyzfMqz00Vi002T-SWf2JEs3IVSvAe1xWLIY0TeuaiegklJx_gvB59SQIhXX2i
      fzRmqPoDdmJGaWZ3tnRyFWNnEogJDqGFCo2RHtk8fXkE5IEiBD0g-tN0GS_XnxlE"/>
    </form>
   </body>
  </html>`;

describe("getJwtFromFormPost", () => {
  it("should return the correct JWT", async () => {
    const { jwt } = await getJwtFromFormPost(fakeFormPost);

    expect(jwt).toEqual(
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmV4YW1wbGUuY29tIiwiYXVkIjoiczZCaGRSa3F0MyIsImV4cCI6MTMxMTI4MTk3MCwiYWNjZXNzX3Rva2VuIjoiMllvdG5GWkZFanIxekNzaWNNV3BBQSIsInN0YXRlIjoiUzhOSjd1cWs1Zlk0RWpOdlBfR19GdHlKdTZwVXN2SDlqc1luaTlkTUFKdyIsInRva2VuX3R5cGUiOiJiZWFyZXIiLCJleHBpcmVzX2luIjoiMzYwMCIsInNjb3BlIjoiZXhhbXBsZSJ9.bgHLOu2dlDjtCnvTLK7hTN_JNwoZXEBnbXQx5vd9z17v1HyzfMqz00Vi002T-SWf2JEs3IVSvAe1xWLIY0TeuaiegklJx_gvB59SQIhXX2ifzRmqPoDdmJGaWZ3tnRyFWNnEogJDqGFCo2RHtk8fXkE5IEiBD0g-tN0GS_XnxlE"
    );
  });

  it("should fail the decode", async () => {
    await expect(getJwtFromFormPost("<html></html>")).rejects.toThrowError(
      ValidationFailed
    );
  });
});
