/* assets.ddl */

/* assets */
drop table assets;
create table if not exists assets ( id varchar(50) not null primary key, name text default '', name_a text default '', num_a int default 0, name_b text default '', num_b int default 0, created bigint default 0, updated bigint default 0 );
