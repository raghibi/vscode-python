ef chiffres_ligne( L,i ):
    T=[]
    for k in range(0,9):
        if L[i][k]!= 0 :
            T.append(L[i][k])
    return T
def chiffres_colonne(L,j):
    T=[]
    for k in range(0,9):
        if L[k][j]!= 0 :
            T.append(L[k][j])
    return T
def chiffres_bloc(L,i,j):
    T=[]
    for k in range(i-(i%3),i+(3-(i%3))):
        for m 
