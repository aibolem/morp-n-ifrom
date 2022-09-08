function printAST(ast, depth = 0) {
    if (ast === null) {
        console.log("Null AST");
    } else {
        console.log(" ".repeat(depth * 2) + `"${ast.text}" (${ast.type}) ${ast.errors}`);
        for (let child of ast.children) {
            printAST(child, depth + 1);
        }
    }
}

function summariseAST(ast) {
    if (ast === null) {
        return null;
    } else {
        let tree = {
            type: ast.type,
            text: ast.text,
        };
        while (ast.children.length == 1) {
            ast = ast.children[0];
            tree.type += " / " + ast.type;
            tree.text = ast.text;
        }
        if (ast.children.length > 1) {
            tree.children = [];
            if (ast.type == "textWords") {
                for (let child of ast.children) {
                    tree.children.push(child.text);
                }
            } else {
                for (let child of ast.children) {
                    tree.children.push(summariseAST(child));
                }
            }
        }
        return tree;
    }
}

export {printAST, summariseAST}
