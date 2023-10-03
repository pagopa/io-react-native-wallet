import { getJwtFromFormPost } from "../decoder";
import { ValidationFailed } from "../errors";

const fakeFormPost = `<html xmlns:tiles="http://www.thymeleaf.org">
	<head>
		<title tiles:fragment="title">Submit This Form</title>
		<meta charset="utf-8">
	</head>
	<body onload="javascript:document.forms[0].submit()">
	    <form method="post" name="action" value="/callback">
	      <input type="hidden" name="response"
	       value="eyJraWQiOiJlTk4tZzVpNkNuTEtjbHRRQnA2YWJiaW9HTWJ6TTZtdVczdnV4dzZ1aDg4IiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwaS5ldWRpLXdhbGxldC1pdC1waWQtcHJvdmlkZXIuaXQiLCJjb2RlIjoic1d6YlNWbC0wUlZ1WGkzclNSeUVQT3ZZM2k0cUZYTXkteV9HbFhyRVdZSSIsInN0YXRlIjoiYzQwZmRiMzctMmJmOC00ZjUzLTg4ZTUtNTY2ZjA5MGQxMjgzIn0.uZtN5FXNFgL-7D0U1ELLOLq_0a6MIg6BFHSVutolqnmJLYnbvlmONvNCTJ3kaWjy7mnNU41MbU4n0VH82-7rJ9ZBYA2Hr1nbgiHJTh38tXRnxjnyE7G1XYxxYEMSRV2Avm4ahSXUlo-tQnzbzFEm9_-2iFxoaVpUjU9crXxfGwRkvX_TAwS7zPeLBIEolLfgDc6ZRvNpmulbVVY_z4vVRlwIQg7N-cLN_Go69KXz-7fyAvuRBWBTE8pxgAnnvjrwapUeQ0PAWTrDO3uu_3ENa09pMHs_UoDuPzGT861yPniIC8Ggx5hWiswl_dCc4lXP5409FAwD27L3XYkHuHfjAg"/>
	    </form>
   </body>
</html>`;

describe("getJwtFromFormPost", () => {
  it("should return the correct JWT", async () => {
    const { jwt } = await getJwtFromFormPost(fakeFormPost);

    expect(jwt).toEqual(
      "eyJraWQiOiJlTk4tZzVpNkNuTEtjbHRRQnA2YWJiaW9HTWJ6TTZtdVczdnV4dzZ1aDg4IiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwaS5ldWRpLXdhbGxldC1pdC1waWQtcHJvdmlkZXIuaXQiLCJjb2RlIjoic1d6YlNWbC0wUlZ1WGkzclNSeUVQT3ZZM2k0cUZYTXkteV9HbFhyRVdZSSIsInN0YXRlIjoiYzQwZmRiMzctMmJmOC00ZjUzLTg4ZTUtNTY2ZjA5MGQxMjgzIn0.uZtN5FXNFgL-7D0U1ELLOLq_0a6MIg6BFHSVutolqnmJLYnbvlmONvNCTJ3kaWjy7mnNU41MbU4n0VH82-7rJ9ZBYA2Hr1nbgiHJTh38tXRnxjnyE7G1XYxxYEMSRV2Avm4ahSXUlo-tQnzbzFEm9_-2iFxoaVpUjU9crXxfGwRkvX_TAwS7zPeLBIEolLfgDc6ZRvNpmulbVVY_z4vVRlwIQg7N-cLN_Go69KXz-7fyAvuRBWBTE8pxgAnnvjrwapUeQ0PAWTrDO3uu_3ENa09pMHs_UoDuPzGT861yPniIC8Ggx5hWiswl_dCc4lXP5409FAwD27L3XYkHuHfjAg"
    );
  });

  it("should fail the decode", async () => {
    await expect(getJwtFromFormPost("<html></html>")).rejects.toThrowError(
      ValidationFailed
    );
  });
});
