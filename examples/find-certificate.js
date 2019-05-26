const rdf = require("rdflib"),
  fs = require("fs");

const graph = new rdf.graph();

const document = fs.readFileSync("./examples/profile.jsonld");

rdf.parse(document, graph, "https://me.examples.open-network.dev/profile.jsonld#me", "application/ld+json", (error) => {
  if (error) {
    return console.error(error);
  }
  const query = rdf.SPARQLToQuery("PREFIX cert: <http://www.w3.org/ns/auth/cert#> SELECT ?m ?e WHERE { ?webid cert:key ?key . ?key cert:modulus ?m . ?key cert:exponent ?e . }", undefined, graph);
  graph.query(
    query,
    result => {
      console.log({ result });
    },
    undefined,
    () => {
      console.log("Finished")
    }
  )
});


