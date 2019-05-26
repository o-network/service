import { AuthResponseContext, CustomAuthorizerResult, PolicyDocument} from "aws-lambda";

export function generatePolicy(principalId: string, effect: string, resource: string, context: AuthResponseContext): CustomAuthorizerResult {
  let policyDocument: PolicyDocument = undefined;
  if (effect && resource) {
    policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource
        }
      ]
    };
  }
  return {
    principalId,
    context,
    policyDocument
  };
}
