const rdf = require("rdflib"),
  fs = require("fs");

const graph = new rdf.graph();

const document = fs.readFileSync("./examples/profile.jsonld");

rdf.parse(document, graph, "https://me.examples.open-network.dev/profile.jsonld#me", "application/ld+json", (error) => {
  if (error) {
    return console.error(error);
  }
  const query = rdf.SPARQLToQuery("PREFIX sp: <http://www.w3.org/ns/pim/space#> SELECT ?webid ?storage WHERE { ?webid sp:storage ?storage . }", undefined, graph);
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


